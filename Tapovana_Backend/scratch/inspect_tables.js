const { query } = require('../src/config/db');

async function inspectTables() {
  const res = await query(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log("=== All Database Tables ===");
  console.log(res.rows.map(r => r.table_name));

  const authCols = await query(`
    SELECT column_name FROM information_schema.columns WHERE table_name = 'users';
  `).catch(() => ({ rows: [] }));
  console.log("=== users table columns ===", authCols.rows.map(r => r.column_name));

  process.exit(0);
}

inspectTables();
