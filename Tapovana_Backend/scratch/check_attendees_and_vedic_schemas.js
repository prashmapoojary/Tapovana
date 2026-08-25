const { query } = require('../src/config/db');

async function checkMoreSchemas() {
  try {
    const tables = ['attendees', 'vedic_programs', 'vedic_attendees', 'vedic_packages_members'];
    for (const t of tables) {
      const res = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [t]);
      console.log(`\n--- TABLE: ${t} ---`);
      console.log(res.rows);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error inspecting schemas:", err);
    process.exit(1);
  }
}

checkMoreSchemas();
