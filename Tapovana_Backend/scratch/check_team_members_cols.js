const { query } = require('../src/config/db');

async function checkCols() {
  const res = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'team_members'");
  console.log("TEAM MEMBERS COLS:", res.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
