require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

pool.query("UPDATE blogs SET status='published', published_at=NOW() WHERE id=11 RETURNING id, title, status")
  .then(r => { console.log('Published:', JSON.stringify(r.rows, null, 2)); pool.end(); })
  .catch(e => { console.error(e.message); pool.end(); });
