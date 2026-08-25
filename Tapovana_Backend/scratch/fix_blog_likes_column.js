const { query } = require('../src/config/db');

async function migrateLikes() {
  try {
    console.log("Adding user_id column to blog_likes...");
    await query('ALTER TABLE blog_likes ADD COLUMN IF NOT EXISTS user_id UUID');
    console.log("Migration successful!");

    // Verify column exists
    const cols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_likes'
    `);
    console.log("Updated blog_likes columns:", cols.rows);

    // Test line 229 query
    const userId = '8bf0519d-c367-44b3-8b80-80a90d9c4dd8';
    const blogIds = [4, 5, 6, 7, 8, 9];
    const likesRes = await query('SELECT blog_id FROM blog_likes WHERE user_id = $1 AND blog_id = ANY($2)', [userId, blogIds]);
    console.log("Likes query succeeded! Rows:", likesRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  }
}

migrateLikes();
