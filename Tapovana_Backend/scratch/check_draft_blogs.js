const { query } = require('../src/config/db');

async function checkBlogs() {
  try {
    const res = await query(`
      SELECT b.id, b.title, b.status, b.created_by, b.created_at,
             tm.email AS author_email, tm.first_name, tm.last_name, r.name AS role_name
      FROM blogs b
      LEFT JOIN team_members tm ON tm.id = b.created_by
      LEFT JOIN roles r ON r.id = tm.role_id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);
    console.log("=== RECENT BLOGS IN DB ===");
    console.log(JSON.stringify(res.rows, null, 2));

    const teams = await query(`
      SELECT tm.id, tm.email, tm.first_name, tm.last_name, r.name AS role_name
      FROM team_members tm
      LEFT JOIN roles r ON r.id = tm.role_id
      LIMIT 10
    `);
    console.log("=== TEAM MEMBERS IN DB ===");
    console.log(JSON.stringify(teams.rows, null, 2));

    process.exit(0);
  } catch (err) {
    console.error("Error checking blogs:", err);
    process.exit(1);
  }
}

checkBlogs();
