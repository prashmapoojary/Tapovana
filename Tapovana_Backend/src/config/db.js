const { Pool } = require('pg');
require('dotenv').config();

// ── Pool configuration optimized for Neon PostgreSQL ──────────────────────
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false          // Neon requires SSL but the cert may not be in your local CA store
  },
  max: 10,                             // max connections (Neon free tier allows ~100 pooled)
  idleTimeoutMillis: 20000,            // close idle clients after 20 seconds (Neon may kill them at ~30s)
  connectionTimeoutMillis: 20000,      // wait up to 20 seconds — allows Neon cold starts to wake up cleanly
  keepAlive: true,                     // send TCP keep-alive packets
  keepAliveInitialDelayMillis: 10000,  // delay before first keep-alive packet
  allowExitOnIdle: false,              // keep pool alive for background jobs
});

// ── Pool-level error handler (prevents unhandled crashes) ─────────────────
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected idle client error:', err.message);
  // Don't crash the process — the pool will replace the dead client automatically
});

// ── Helper: determine if an error is transient (retryable) ────────────────
const isTransientError = (err) => {
  if (!err) return false;
  
  const transientCodes = [
    'ENOTFOUND', 'ECONNREFUSED', 'ETIMEDOUT', 'ECONNRESET',
    'EPIPE', 'EAI_AGAIN', 'EHOSTUNREACH', '57P01', '57P02', '57P03'
  ];

  const checkMessage = (msg) => {
    if (!msg) return false;
    const msgLower = msg.toLowerCase();
    return (
      msgLower.includes('connection terminated') ||
      msgLower.includes('connection error') ||
      msgLower.includes('econnreset') ||
      msgLower.includes('etimedout') ||
      msgLower.includes('enotfound') ||
      msgLower.includes('getaddrinfo') ||
      msgLower.includes('socket hang up') ||
      msgLower.includes('timeout') ||
      msgLower.includes('terminated due to connection timeout') ||
      msgLower.includes('unexpectedly')
    );
  };

  // pg error codes / Node system error codes
  if (err.code && transientCodes.includes(err.code)) return true;

  // pg-pool / pg connection error message checks
  if (err.message && checkMessage(err.message)) return true;

  // Check the error cause message (e.g. wrapper errors from pg-pool)
  if (err.cause) {
    if (err.cause.code && transientCodes.includes(err.cause.code)) return true;
    if (err.cause.message && checkMessage(err.cause.message)) return true;
  }

  return false;
};

// ── Query wrapper with exponential backoff retry for Neon cold starts ─────
const query = async (text, params, retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      if (isTransientError(err) && attempt < retries - 1) {
        // Exponential backoff: 1s, 2s, 4s (capped)
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.warn(`[DB] Query failed (attempt ${attempt + 1}/${retries}): ${err.message} — retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

// ── getClient wrapper with transient error retry and safe release ──────────
const getClient = async (retries = 3) => {
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const client = await pool.connect();
      // Monkey-patch to log long-held connections (helps debug leaks)
      const _release = client.release.bind(client);
      const acquiredAt = Date.now();
      let released = false;
      client.release = () => {
        if (released) return;      // prevent double-release crashes
        released = true;
        const heldMs = Date.now() - acquiredAt;
        if (heldMs > 10000) {
          console.warn(`[DB Pool] Client held for ${heldMs}ms before release — consider optimizing this query batch.`);
        }
        _release();
      };
      return client;
    } catch (err) {
      if (isTransientError(err) && attempt < retries - 1) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000);
        console.warn(`[DB Pool] Connect failed (attempt ${attempt + 1}/${retries}): ${err.message} — retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

module.exports = { query, getClient, pool };