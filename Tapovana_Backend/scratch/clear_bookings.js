const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Clearing all existing bookings from Neon PostgreSQL database...\n');

  const delBookings = await c.query('DELETE FROM bookings;');
  console.log(`Cleared ${delBookings.rowCount} bookings.`);

  const delDeleted = await c.query('DELETE FROM deleted_booking_ids;');
  console.log(`Cleared ${delDeleted.rowCount} deleted booking log IDs.`);

  console.log('\n✅ All bookings removed from database! The table is fresh and empty.');
  await c.end();
}

main().catch(err => { console.error('Error clearing bookings:', err); process.exit(1); });
