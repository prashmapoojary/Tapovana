const { query } = require('../src/config/db');

async function checkCols() {
  const wcCols = await query("SELECT column_name FROM information_schema.columns WHERE table_name = 'workshop_certificates'");
  console.log("WORKSHOP_CERTIFICATES TABLE COLS:", wcCols.rows.map(r => r.column_name));
  process.exit(0);
}

checkCols();
