const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkState() {
  try {
    const tm = await pool.query("SELECT id, first_name, last_name, email, role_id, status FROM team_members");
    console.log("--- TEAM MEMBERS IN DB ---");
    console.table(tm.rows);

    const ws = await pool.query("SELECT id, title, instructor, instructor_id, assigned_staff_ids FROM workshops");
    console.log("\n--- WORKSHOPS IN DB ---");
    console.table(ws.rows);

    const alloc = await pool.query("SELECT id, staff_id, type, session_title, session_id FROM allocations");
    console.log("\n--- ALLOCATIONS IN DB ---");
    console.table(alloc.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkState();
