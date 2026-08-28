const { query } = require('../src/config/db');

async function testFetchVedicPrograms() {
  console.log("🌟 --- CHECKING VEDIC PROGRAMS IN DATABASE --- 🌟\n");

  const res = await query("SELECT id, title, type, price, start_date, end_date, created_at FROM vedic_programs");
  console.log(`📌 Found ${res.rows.length} Vedic Programs in PostgreSQL database:`);
  console.table(res.rows);

  process.exit(0);
}

testFetchVedicPrograms().catch(err => {
  console.error("❌ Error fetching programs:", err);
  process.exit(1);
});
