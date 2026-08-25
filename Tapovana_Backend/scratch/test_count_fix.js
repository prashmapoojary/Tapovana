const { query } = require('../src/config/db');

async function testCount() {
  try {
    const user = { id: '8bf0519d-c367-44b3-8b80-80a90d9c4dd8', email: '29prashma10@gmail.com' };
    const params = [user.id, user.email, 'draft'];
    const whereClause = 'WHERE (b.created_by = $1 OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER($2))) AND b.status = $3';

    console.log("Testing broken count query (without tm join)...");
    try {
      await query(`SELECT COUNT(*) FROM blogs b ${whereClause}`, params);
    } catch (err) {
      console.log("EXACT ERROR CAPTURED:", err.message);
    }

    console.log("Testing fixed count query (with tm join)...");
    const fixed = await query(`SELECT COUNT(*) FROM blogs b LEFT JOIN team_members tm ON tm.id = b.created_by ${whereClause}`, params);
    console.log("Fixed Count Success! Count:", fixed.rows[0].count);

    process.exit(0);
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testCount();
