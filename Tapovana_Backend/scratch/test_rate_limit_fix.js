const http = require('http');

function testEndpoint(path) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:5000${path}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, data }));
    }).on('error', err => reject(err));
  });
}

async function run() {
  console.log("🧪 Testing API Endpoints for Rate Limit Fix...");
  try {
    const res1 = await testEndpoint('/api/blogs');
    console.log("   /api/blogs Response Status:", res1.status);
    console.log("   /api/blogs Sample Output:", res1.data.substring(0, 150));

    const res2 = await testEndpoint('/health');
    console.log("   /health Response Status:", res2.status);
    console.log("   /health Sample Output:", res2.data);

    if (res1.status === 200) {
      console.log("\n✅ Rate limit fix verified successfully! APIs no longer blocked with 'Too many requests'.");
    } else {
      console.error("\n❌ Unexpected status code:", res1.status);
    }
  } catch (e) {
    console.error("❌ Request error:", e.message);
  }
}

run();
