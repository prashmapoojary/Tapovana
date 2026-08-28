const { query } = require('../src/config/db');

async function check() {
  const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'");
  console.log("COLUMNS:", res.rows.map(r => r.column_name));
  process.exit(0);
}
check();
