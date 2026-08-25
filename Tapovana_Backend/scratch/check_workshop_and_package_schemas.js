const { query } = require('../src/config/db');

async function checkSchemas() {
  try {
    const tables = ['workshops', 'workshop_registrations', 'workshop_attendees', 'vedic_packages', 'vedic_life_programs', 'program_enrollments', 'package_bookings', 'users', 'customers'];
    for (const t of tables) {
      const res = await query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = $1
      `, [t]);
      console.log(`\n--- TABLE: ${t} ---`);
      if (res.rows.length === 0) console.log("Table does not exist");
      else console.log(res.rows);
    }
    process.exit(0);
  } catch (err) {
    console.error("Error inspecting schemas:", err);
    process.exit(1);
  }
}

checkSchemas();
