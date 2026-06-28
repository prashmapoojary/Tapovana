// utils/publicUrl.js
//
// Resolves the PUBLIC backend URL used in certificate links, emails, etc.
// This must NEVER resolve to a local IP or "localhost" — if it did,
// links sent in emails would break for the recipient (this was the
// root cause of the "site can't be reached" / localhost bug).
//
// Local IP detection (getLocalIpAddress) is fine for *local dev console
// logs* but must never be used as a fallback for anything that leaves
// your machine (emails, stored DB URLs, etc).

const PRODUCTION_FALLBACK_URL = 'https://tapovana.onrender.com';

/**
 * Returns the safe, public-facing base URL for building certificate
 * links, email links, etc.
 *
 * Priority:
 *   1. BACKEND_URL          (explicit override, set this on Render)
 *   2. RENDER_EXTERNAL_URL  (Render sets this automatically per service)
 *   3. SELF_URL             (legacy/alternate override name)
 *   4. Hardcoded production fallback (tapovana.onrender.com)
 *
 * Local IP / localhost is intentionally NEVER part of this chain.
 * If you need a local URL for *local testing only*, use
 * getLocalDevUrl() below instead, and never pass its result into
 * an email or a value stored in the database.
 */
function getPublicBaseUrl() {
  const candidate =
    process.env.BACKEND_URL ||
    process.env.RENDER_EXTERNAL_URL ||
    process.env.SELF_URL ||
    PRODUCTION_FALLBACK_URL;

  // Defensive guard: even if someone misconfigures an env var to a
  // local address, refuse it and fall back to the production URL
  // rather than ever emitting a localhost/private-IP link.
  if (isLocalAddress(candidate)) {
    console.warn(
      `[publicUrl] Refusing local-looking BACKEND_URL/RENDER_EXTERNAL_URL/SELF_URL ` +
      `("${candidate}") for a public link. Falling back to ${PRODUCTION_FALLBACK_URL}. ` +
      `Fix the env var on Render if this is unexpected.`
    );
    return PRODUCTION_FALLBACK_URL;
  }

  return candidate.replace(/\/+$/, ''); // strip trailing slash
}

/**
 * Detects localhost / private network addresses so they can never
 * be used in a public-facing URL.
 */
function isLocalAddress(url) {
  if (!url) return true;
  return (
    /localhost/i.test(url) ||
    /127\.0\.0\.1/.test(url) ||
    /^https?:\/\/192\.168\./i.test(url) ||
    /^https?:\/\/10\./i.test(url) ||
    /^https?:\/\/172\.(1[6-9]|2[0-9]|3[0-1])\./i.test(url)
  );
}

/**
 * ONLY for local development convenience (e.g. console logging while
 * you test on your own machine/phone on the same LAN). NEVER use this
 * for emails or anything saved to the database.
 */
function getLocalDevUrl(localIp, port) {
  return `http://${localIp}:${port}`;
}

module.exports = { getPublicBaseUrl, getLocalDevUrl, isLocalAddress };
