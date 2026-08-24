const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  
  // Create the trigger function that was in schema.sql but missing from backup restore
  await c.query(`SET search_path TO public;`);
  await c.query(`
    CREATE OR REPLACE FUNCTION set_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);
  console.log('✅ set_updated_at() function created');

  // Create triggers for tables that already exist
  const triggers = [
    { name: 'trg_team_members_updated', table: 'team_members' },
    { name: 'trg_credentials_updated', table: 'login_credentials' },
    { name: 'trg_services_updated', table: 'services' },
    { name: 'trg_workshops_updated', table: 'workshops' },
    { name: 'trg_bookings_updated', table: 'bookings' },
    { name: 'trg_vedic_programs_updated', table: 'vedic_programs' },
    { name: 'trg_allocations_updated', table: 'allocations' },
  ];

  for (const t of triggers) {
    try {
      await c.query(`
        CREATE TRIGGER ${t.name}
        BEFORE UPDATE ON ${t.table}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
      `);
      console.log(`✅ Trigger ${t.name} created on ${t.table}`);
    } catch (err) {
      if (err.code === '42710') {
        console.log(`⏭️ Trigger ${t.name} already exists`);
      } else if (err.code === '42P01') {
        console.log(`⏭️ Table ${t.table} doesn't exist yet, skipping trigger`);
      } else {
        console.log(`⚠️ Trigger ${t.name}: ${err.message}`);
      }
    }
  }

  await c.end();
  console.log('\nDone!');
}

main().catch(err => { console.error(err); process.exit(1); });
