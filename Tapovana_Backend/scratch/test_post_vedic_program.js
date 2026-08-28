require('dotenv').config();
const http = require('http');
const jwt = require('jsonwebtoken');
const { query } = require('../src/config/db');

async function testPost() {
  const userRes = await query(`
    SELECT tm.id, tm.email, r.name AS role 
    FROM team_members tm 
    JOIN roles r ON r.id = tm.role_id 
    WHERE tm.email = 'prashmapoojary@gmail.com' 
    LIMIT 1
  `);
  if (!userRes.rows.length) {
    console.error("User not found in team_members table!");
    process.exit(1);
  }

  const user = userRes.rows[0];
  console.log(`Found DB Team Member: ID=${user.id}, Email=${user.email}, Role=${user.role}`);

  const token = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  const data = JSON.stringify({
    title: "Test Vedic Life Retreat 2026",
    type: "RETREAT",
    description: "Test description for Vedic program.",
    duration: "5 days",
    startDate: "2026-11-01",
    endDate: "2026-11-05",
    capacity: 10,
    price: 15000,
    accommodations: "Standard Room",
    lead_consultant_id: "e3b7e479-11b0-47b1-b583-e918120ec75b", // Dr. Prashma Salian
    services: ["Abhyanga"],
    languages: ["English"]
  });

  const req = http.request({
    hostname: 'localhost',
    port: 5000,
    path: '/api/vedic-programs',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': data.length,
      'Authorization': `Bearer ${token}`
    }
  }, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log('POST /api/vedic-programs Status:', res.statusCode);
      console.log('Response Body:', body);
      process.exit(0);
    });
  });

  req.on('error', (e) => {
    console.error('Request Error:', e);
    process.exit(1);
  });

  req.write(data);
  req.end();
}

testPost();
