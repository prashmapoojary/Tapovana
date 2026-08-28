const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkTables() {
  try {
    const res = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
    console.log("Tables:", res.rows.map(r => r.table_name));

    // Search for email across all tables that have an email column
    const cols = await pool.query("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%email%'");
    console.log("\nEmail columns:", cols.rows);

    for (let row of cols.rows) {
      const q = await pool.query(`SELECT * FROM "${row.table_name}" WHERE LOWER("${row.column_name}") = LOWER($1)`, ['nethrakanchan40@gmail.com']);
      if (q.rows.length > 0) {
        console.log(`\nMatch found in table ${row.table_name} (${row.column_name}):`, q.rows);
      }
    }
  } catch (err) {
    console.error("DB Error:", err);
  } finally {
    await pool.end();
  }
}

checkTables();
