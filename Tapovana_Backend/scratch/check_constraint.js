const { pool } = require('../src/config/db');

async function main() {
  const res = await pool.query("SELECT conname, pg_get_constraintdef(oid) as def FROM pg_constraint WHERE conname LIKE '%allocations%'");
  console.log('Allocations Constraints:', res.rows);
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
