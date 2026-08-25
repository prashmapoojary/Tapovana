const { query } = require('../src/config/db');

async function listStaff() {
  try {
    const res = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role_name
      FROM team_members tm
      LEFT JOIN roles r ON r.id = tm.role_id
      ORDER BY tm.first_name ASC
    `);
    console.log("Team Members found in DB:", res.rows.length);
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error("Failed to list staff:", err);
    process.exit(1);
  }
}

listStaff();
