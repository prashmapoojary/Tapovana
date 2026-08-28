const { query } = require('../src/config/db');

async function checkCols() {
  const bCols = await query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'blogs'");
  console.log("BLOGS TABLE COLUMNS:", bCols.rows);
  process.exit(0);
}

checkCols();
