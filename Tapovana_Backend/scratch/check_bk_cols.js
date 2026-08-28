const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkCols() {
  const cols = await pool.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'bookings'");
  console.log("bookings columns:", cols.rows.map(r => r.column_name));
  await pool.end();
}

checkCols();
