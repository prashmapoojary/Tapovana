const { query } = require('../src/config/db');

async function checkCols() {
  const pCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vedic_programs'");
  const aCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'vedic_attendees'");
  console.log("VEDIC_PROGRAMS COLS:", pCols.rows.map(r => r.column_name));
  console.log("VEDIC_ATTENDEES COLS:", aCols.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
