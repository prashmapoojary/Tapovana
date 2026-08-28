const { query } = require('../src/config/db');

async function checkCols() {
  const bCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'");
  console.log("BOOKINGS TABLE COLS:", bCols.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
