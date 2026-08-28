const http = require('http');

http.get('http://localhost:5000/health', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log("HEALTH CHECK STATUS:", res.statusCode);
    console.log("HEALTH CHECK BODY:", data);
  });
}).on('error', (err) => {
  console.error("Health check failed:", err.message);
});
