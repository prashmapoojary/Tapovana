const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: true
  },
  connectionTimeoutMillis: 60000,
  idleTimeoutMillis: 60000,
  max: 5,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});

pool.on('error', (err) => {
  console.error('Database pool error:', err);
});

// Retry wrapper with longer delays for Neon cold starts
const query = async (text, params, retries = 5) => {
  for (let i = 0; i < retries; i++) {
    try {
      return await pool.query(text, params);
    } catch (err) {
      const isTransient = err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT' || err.code === 'ECONNRESET';
      if (isTransient && i < retries - 1) {
        const delay = (i + 1) * 3000;
        console.warn('DB connection failed (attempt ' + (i + 1) + '), retrying in ' + delay + 'ms...');
        await new Promise(res => setTimeout(res, delay));
      } else {
        throw err;
      }
    }
  }
};

const getClient = () => pool.connect();

module.exports = { query, getClient, pool };