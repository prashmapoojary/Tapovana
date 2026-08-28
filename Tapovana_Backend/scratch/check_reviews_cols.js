const { query } = require('../src/config/db');

async function run() {
  const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'reviews'");
  console.log("REVIEWS COLS:", res.rows.map(r => r.column_name));
  process.exit(0);
}
run();
