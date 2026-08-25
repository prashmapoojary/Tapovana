const { getBlogById } = require('../src/controllers/blogsController');
const { query } = require('../src/config/db');

async function testGetById() {
  try {
    const resBlogs = await query('SELECT id, title, status FROM blogs LIMIT 5');
    console.log("Existing blogs in DB:", resBlogs.rows);

    if (resBlogs.rows.length === 0) {
      console.log("No blogs in DB to test!");
      process.exit(0);
    }

    const testId = resBlogs.rows[0].id;
    console.log(`Testing getBlogById for ID ${testId}...`);

    const req = {
      params: { id: String(testId) },
      user: {
        id: '8bf0519d-c367-44b3-8b80-80a90d9c4dd8',
        email: 'admin@tapovana.com',
        role: 'SUPER_ADMIN'
      }
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("Status Code:", this.statusCode || 200);
        console.log("Response:", data);
      }
    };

    await getBlogById(req, res);
    process.exit(0);
  } catch (err) {
    console.error("EXACT ERROR in getBlogById:", err);
    process.exit(1);
  }
}

testGetById();
