const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function inspect() {
  try {
    const staffRes = await pool.query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.availability_status, r.name as role_name
      FROM team_members tm
      LEFT JOIN roles r ON tm.role_id = r.id
      WHERE LOWER(tm.email) IN ('29prashma10@gmail.com', 'saliannagaprasad22@gmail.com')
    `);
    console.log("--- TARGET TEAM MEMBERS ---");
    console.log(staffRes.rows);

    const wsRes = await pool.query(`
      SELECT id, title, category, date, time, instructor, instructor_id, assigned_staff_ids, status
      FROM workshops
      ORDER BY date ASC, time ASC
    `);
    console.log("\n--- WORKSHOPS IN DATABASE (" + wsRes.rows.length + ") ---");
    console.log(wsRes.rows);

  } catch (err) {
    console.error("Error:", err);
  } finally {
    await pool.end();
  }
}

inspect();
