const { trackBlogView } = require('../src/controllers/blogsController');
const { query } = require('../src/config/db');

async function testTrackAndAudit() {
  try {
    const resBlogs = await query('SELECT id FROM blogs LIMIT 1');
    if (resBlogs.rows.length === 0) {
      console.log("No blogs in DB.");
      process.exit(0);
    }

    const testId = resBlogs.rows[0].id;
    console.log(`Testing trackBlogView for blog ID ${testId}...`);

    const req = {
      params: { id: String(testId) },
      headers: { 'x-forwarded-for': '127.0.0.1' },
      user: { id: '8bf0519d-c367-44b3-8b80-80a90d9c4dd8' }
    };

    const res = {
      json(data) {
        console.log("trackBlogView response:", data);
      }
    };

    await trackBlogView(req, res);

    console.log("Checking blog_views table entries...");
    const views = await query('SELECT * FROM blog_views WHERE blog_id = $1 ORDER BY viewed_at DESC LIMIT 1', [testId]);
    console.log("Latest view record:", views.rows);

    process.exit(0);
  } catch (err) {
    console.error("EXACT ERROR in trackBlogView:", err);
    process.exit(1);
  }
}

testTrackAndAudit();
