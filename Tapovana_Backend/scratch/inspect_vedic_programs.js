const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function main() {
  try {
    await client.connect();
    console.log("=== VEDIC PROGRAMS ===");
    const res = await client.query("SELECT id, title, type, enrolled, capacity, status, start_date, end_date FROM vedic_programs");
    console.log(JSON.stringify(res.rows, null, 2));

    console.log("\n=== ALLOCATIONS ===");
    const allocs = await client.query("SELECT id, staff_id, type, session_title, session_id, status FROM allocations WHERE type = 'vedic_program'");
    console.log(JSON.stringify(allocs.rows, null, 2));
    
  } catch (err) {
    console.error("Failed:", err);
  } finally {
    await client.end();
  }
}

main();
