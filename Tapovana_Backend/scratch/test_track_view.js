const { query } = require('../src/config/db');

async function testTrackView() {
  try {
    console.log("1. Adding user_id column to blog_views if missing...");
    await query('ALTER TABLE blog_views ADD COLUMN IF NOT EXISTS user_id UUID');

    console.log("2. Inspecting blog_views table columns...");
    const cols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'blog_views'
    `);
    console.log("Columns:", cols.rows);

    const blogId = 4;
    const ip = '127.0.0.1';
    const userId = '8bf0519d-c367-44b3-8b80-80a90d9c4dd8';

    console.log("3. Testing duplicate check query...");
    const duplicate = await query(`
      SELECT id FROM blog_views
      WHERE blog_id = $1 AND (ip_address = $2 OR ($3::uuid IS NOT NULL AND user_id = $3))
        AND viewed_at > NOW() - INTERVAL '24 hours'
      LIMIT 1
    `, [blogId, ip, userId]);
    console.log("Duplicate result:", duplicate.rows);

    console.log("4. Testing insert query...");
    await query('INSERT INTO blog_views (blog_id, ip_address, user_id, viewed_at) VALUES ($1, $2, $3, NOW())', [blogId, ip, userId]);
    console.log("Insert successful!");

    process.exit(0);
  } catch (err) {
    console.error("EXACT ERROR in trackBlogView test:", err);
    process.exit(1);
  }
}

testTrackView();
