const { query } = require('../src/config/db');

async function checkTeamRoles() {
  const res = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.role_id, tm.status, r.name AS role_name
    FROM team_members tm
    LEFT JOIN roles r ON tm.role_id = r.id
  `);
  console.table(res.rows);
}

checkTeamRoles();
