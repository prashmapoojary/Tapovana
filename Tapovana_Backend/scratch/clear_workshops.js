const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Clearing all Workshop records from Neon PostgreSQL database...\n');

  try {
    const regDel = await c.query('DELETE FROM workshop_registrations;');
    console.log(`Cleared ${regDel.rowCount} workshop registrations.`);
  } catch (e) {
    console.log('workshop_registrations table note:', e.message);
  }

  try {
    const attDel = await c.query('DELETE FROM workshop_attendees;');
    console.log(`Cleared ${attDel.rowCount} workshop attendees.`);
  } catch (e) {
    console.log('workshop_attendees table note:', e.message);
  }

  const wsDel = await c.query('DELETE FROM workshops;');
  console.log(`Cleared ${wsDel.rowCount} workshops.`);

  console.log('\n✅ All Workshop records successfully deleted from database!');
  await c.end();
}

main().catch(err => { console.error('Error clearing workshops:', err); process.exit(1); });
