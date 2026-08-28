const { query } = require('../src/config/db');

async function checkCols() {
  const wCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'workshops'");
  console.log("WORKSHOPS TABLE COLS:", wCols.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
