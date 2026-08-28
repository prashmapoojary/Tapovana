const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function inspectTeam() {
  try {
    const res = await pool.query("SELECT id, first_name, last_name, email, role_id, status FROM team_members");
    console.log("--- CURRENT TEAM MEMBERS (" + res.rows.length + ") ---");
    console.table(res.rows);

    const prashma = res.rows.find(r => r.email && r.email.toLowerCase() === 'prashmapoojary@gmail.com');
    if (!prashma) {
      console.log("⚠️ prashmapoojary@gmail.com not found! Checking case-insensitive search...");
    } else {
      console.log("✅ Main admin to keep:", prashma);
    }
  } catch (err) {
    console.error(err);
  } finally {
    await pool.end();
  }
}

inspectTeam();
