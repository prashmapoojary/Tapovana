const { query } = require('../src/config/db');

async function checkTables() {
  const res = await query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
  console.log("ALL TABLES:", res.rows.map(r => r.table_name));
  process.exit(0);
}

checkTables();
