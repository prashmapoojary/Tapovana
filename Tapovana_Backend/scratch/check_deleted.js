const { pool } = require('../src/config/db');

async function main() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS deleted_memberships (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log('✅ deleted_memberships table created or verified!');
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
