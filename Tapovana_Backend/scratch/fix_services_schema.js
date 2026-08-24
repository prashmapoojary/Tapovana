const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  console.log('Adding missing column assigned_staff_details to services table...');
  await c.query(`
    ALTER TABLE services 
    ADD COLUMN IF NOT EXISTS assigned_staff_details JSONB DEFAULT '[]'::jsonb;
  `);
  console.log('✅ Column assigned_staff_details added successfully!');
  await c.end();
}

main().catch(err => { console.error('Migration failed:', err); process.exit(1); });
