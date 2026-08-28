const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function checkStaff() {
  try {
    const res = await pool.query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.availability_status, r.name as role_name
      FROM team_members tm
      LEFT JOIN roles r ON tm.role_id = r.id
      WHERE LOWER(tm.first_name) LIKE '%naga%' OR LOWER(tm.last_name) LIKE '%naga%' OR LOWER(tm.email) LIKE '%naga%' OR tm.id = '5185ecb8-47b0-45ff-a37f-09de4f0e549d'
    `);
    console.log("Nagaprasad staff details:", res.rows);
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

checkStaff();
