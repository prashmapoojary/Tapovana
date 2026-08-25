const { query } = require('../src/config/db');

async function findTables() {
  try {
    const res = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name ASC
    `);
    console.log("All Public Tables in DB:");
    console.log(res.rows.map(r => r.table_name));
    process.exit(0);
  } catch (err) {
    console.error("Error finding tables:", err);
    process.exit(1);
  }
}

findTables();
