const { query } = require('../src/config/db');

async function inspectLoginCreds() {
  const cols = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'login_credentials' 
    ORDER BY ordinal_position;
  `);
  console.log("=== login_credentials columns ===");
  console.table(cols.rows);

  const creds = await query(`SELECT id, email, role, member_id FROM login_credentials LIMIT 10;`);
  console.log("=== sample login_credentials ===");
  console.table(creds.rows);

  process.exit(0);
}

inspectLoginCreds();
