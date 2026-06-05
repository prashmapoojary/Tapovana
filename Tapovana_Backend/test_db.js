const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to database. Fetching roles...");
    const roles = await client.query("SELECT * FROM roles");
    console.log("Roles:");
    console.log(roles.rows);

    console.log("\nFetching team members...");
    const members = await client.query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.phone, tm.status, r.name AS role
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
    `);
    console.log("Team Members:");
    console.log(members.rows);

    console.log("\nFetching login credentials...");
    const credentials = await client.query("SELECT member_id, must_change, last_login FROM login_credentials");
    console.log("Credentials:");
    console.log(credentials.rows);

    console.log("\nFetching OTP verification records...");
    const otps = await client.query("SELECT member_id, otp_type, expires_at, used, attempts, created_at FROM otp_verification ORDER BY created_at DESC LIMIT 5");
    console.log("OTP Verification Logs:");
    console.log(otps.rows);

  } catch (err) {
    console.error("Database query failed:");
    console.error(err);
  } finally {
    await client.end();
  }
}

main();
