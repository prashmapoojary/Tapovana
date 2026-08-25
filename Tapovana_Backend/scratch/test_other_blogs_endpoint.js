const { getAllBlogs } = require('../src/controllers/blogsController');
const { query } = require('../src/config/db');

async function testOtherBlogsEndpoint() {
  try {
    console.log("Testing GET /api/blogs?status=other_blogs for Dr. Nagaprasad Salian...");

    const req = {
      query: { status: 'other_blogs', limit: '20', page: '1' },
      user: {
        id: '5185ecb8-47b0-45ff-a37f-09de4f0e549d',
        email: 'saliannagaprasad22@gmail.com',
        role: 'DOCTOR'
      }
    };

    const res = {
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        console.log("Status Code:", this.statusCode || 200);
        console.log("Blogs returned count:", data.blogs ? data.blogs.length : 0);
        if (data.blogs) {
          console.log("Blogs list:", data.blogs.map(b => ({
            id: b.id,
            title: b.title,
            status: b.status,
            author: b.author ? b.author.name : b.author_email
          })));
        }
      }
    };

    await getAllBlogs(req, res);
    process.exit(0);
  } catch (err) {
    console.error("Error in testOtherBlogsEndpoint:", err);
    process.exit(1);
  }
}

testOtherBlogsEndpoint();
