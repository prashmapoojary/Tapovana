const { pool } = require('../src/config/db');

async function main() {
  const tables = ['membership_tiers', 'bookings', 'attendees', 'vedic_attendees', 'memberships'];
  for (const t of tables) {
    const cols = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1`, [t]);
    console.log(`\n=== TABLE: ${t} ===`);
    console.log(cols.rows);
  }

  const tiers = await pool.query('SELECT * FROM membership_tiers');
  console.log('\n=== CURRENT MEMBERSHIP TIERS ===');
  console.log(tiers.rows);

  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });
