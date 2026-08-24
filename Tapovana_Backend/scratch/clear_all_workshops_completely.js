const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Completely deleting all Workshop records from Neon PostgreSQL database...\n');

  try {
    const attDel = await c.query('DELETE FROM attendees;');
    console.log(`Cleared ${attDel.rowCount} attendees.`);
  } catch (e) {
    console.log('attendees table note:', e.message);
  }

  try {
    const certDel = await c.query('DELETE FROM certificates WHERE workshop_id IS NOT NULL;');
    console.log(`Cleared ${certDel.rowCount} workshop certificates.`);
  } catch (e) {
    console.log('certificates table note:', e.message);
  }

  const wsDel = await c.query('TRUNCATE TABLE workshops CASCADE;');
  console.log(`Truncated workshops table.`);

  const countRes = await c.query('SELECT COUNT(*) FROM workshops');
  console.log(`Workshops count in DB now: ${countRes.rows[0].count}`);

  console.log('\n✅ All Workshop records successfully deleted from database!');
  await c.end();
}

main().catch(err => { console.error('Error clearing workshops:', err); process.exit(1); });
