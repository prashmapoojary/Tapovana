const { query } = require('../src/config/db');

async function inspectColumns() {
  console.log("=== INSPECTING TABLE COLUMNS ===");

  try {
    const wsCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'workshops'
    `);
    console.log("\n--- WORKSHOPS COLUMNS ---");
    console.table(wsCols.rows);

    const vpCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'vedic_programs'
    `);
    console.log("\n--- VEDIC_PROGRAMS COLUMNS ---");
    console.table(vpCols.rows);

    const bkCols = await query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'bookings'
    `);
    console.log("\n--- BOOKINGS COLUMNS ---");
    console.table(bkCols.rows);

  } catch (e) {
    console.error("Inspect error:", e);
  }

  process.exit(0);
}

inspectColumns();
