const { query } = require('../src/config/db');

async function inspectTeamSchema() {
  const cols = await query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'team_members'
    ORDER BY ordinal_position;
  `);
  console.log("=== team_members Columns ===");
  console.table(cols.rows);

  const roles = await query(`SELECT * FROM roles;`);
  console.log("\n=== roles Table ===");
  console.table(roles.rows);

  const currentMembers = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role_name 
    FROM team_members tm
    LEFT JOIN roles r ON r.id = tm.role_id;
  `);
  console.log("\n=== Current team_members ===");
  console.table(currentMembers.rows);

  process.exit(0);
}

inspectTeamSchema();
