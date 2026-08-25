const { getAllBlogs } = require('../src/controllers/blogsController');

// Mock req and res objects
function createMockRes(statusName) {
  return {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      console.log(`\n=== ENDPOINT STATUS: ${statusName} ===`);
      console.log(`HTTP Status: ${this.statusCode || 200}`);
      console.log(`Success: ${data.success}`);
      console.log(`Blogs Count: ${data.blogs ? data.blogs.length : 0}`);
      if (!data.success) {
        console.error(`Error message: ${data.message}`);
      }
    }
  };
}

async function testAllEndpoints() {
  const mockUser = {
    id: '8bf0519d-c367-44b3-8b80-80a90d9c4dd8',
    email: 'admin@tapovana.com',
    role_name: 'SUPER_ADMIN'
  };

  const mockDoctor = {
    id: '7a91823c-d4e5-4f6a-9b12-3c4d5e6f7a8b',
    email: 'doctor@tapovana.com',
    role_name: 'DOCTOR'
  };

  const statuses = ['my_blogs', 'draft', 'pending_review', 'published', 'rejected', 'archived', 'other_blogs'];

  console.log("--- TESTING AS DOCTOR / THERAPIST ---");
  for (const st of statuses) {
    const req = {
      query: { status: st, page: 1, limit: 10 },
      user: mockDoctor
    };
    const res = createMockRes(`Doctor - ${st}`);
    await getAllBlogs(req, res);
  }

  console.log("\n--- TESTING AS ADMIN ---");
  for (const st of ['published', 'pending_review', 'archived']) {
    const req = {
      query: { status: st, page: 1, limit: 10 },
      user: mockUser
    };
    const res = createMockRes(`Admin - ${st}`);
    await getAllBlogs(req, res);
  }

  process.exit(0);
}

testAllEndpoints();
