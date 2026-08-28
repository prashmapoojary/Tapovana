const { query } = require('../src/config/db');

async function checkRoles() {
  const res = await query("SELECT id, name, label FROM roles");
  console.log("ROLES IN DB:", res.rows);
  process.exit(0);
}

checkRoles().catch(console.error);
