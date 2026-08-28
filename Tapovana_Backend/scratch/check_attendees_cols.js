const { query } = require('../src/config/db');

async function checkCols() {
  const aCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'attendees'");
  console.log("ATTENDEES TABLE COLS:", aCols.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
