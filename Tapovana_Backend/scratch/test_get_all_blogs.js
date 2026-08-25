const { query } = require('../src/config/db');

async function testQuery() {
  try {
    const userRes = await query(`SELECT tm.id, tm.email, r.name AS role FROM team_members tm JOIN roles r ON r.id = tm.role_id WHERE LOWER(tm.email) = '29prashma10@gmail.com'`);
    const user = userRes.rows[0];
    console.log("User:", user);

    const userId = user.id;
    const userEmail = user.email;

    // Test status = 'draft' query
    const resDraft = await query(`
      SELECT b.id, b.title, b.status, b.created_by, tm.email AS author_email
      FROM blogs b
      LEFT JOIN team_members tm ON tm.id = b.created_by
      WHERE (b.created_by = $1 OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER($2))) AND b.status = $3
    `, [userId, userEmail, 'draft']);
    console.log("Draft Query Count:", resDraft.rows.length);
    console.log("Draft Blogs:", resDraft.rows);

    // Test status = 'my_blogs' query
    const resMy = await query(`
      SELECT b.id, b.title, b.status, b.created_by, tm.email AS author_email
      FROM blogs b
      LEFT JOIN team_members tm ON tm.id = b.created_by
      WHERE (b.created_by = $1 OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER($2)))
    `, [userId, userEmail]);
    console.log("My Blogs Query Count:", resMy.rows.length);
    console.log("My Blogs:", resMy.rows);

    process.exit(0);
  } catch (err) {
    console.error("Test error:", err);
    process.exit(1);
  }
}

testQuery();
