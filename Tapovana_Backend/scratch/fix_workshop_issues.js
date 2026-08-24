const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected!');

  // 1. Create workshop_audit_log table if missing
  await c.query(`
    CREATE TABLE IF NOT EXISTS workshop_audit_log (
      id SERIAL PRIMARY KEY,
      workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
      action VARCHAR(50) NOT NULL,
      performed_by UUID REFERENCES team_members(id) ON DELETE SET NULL,
      details TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('✅ workshop_audit_log table verified/created');

  // 2. Fix workshops_status_check constraint to allow Uppercase values ('Upcoming', 'Live', 'Completed', 'Cancelled', 'upcoming', 'ongoing', 'full', 'completed')
  await c.query(`ALTER TABLE workshops DROP CONSTRAINT IF EXISTS workshops_status_check;`);
  await c.query(`
    ALTER TABLE workshops ADD CONSTRAINT workshops_status_check 
    CHECK (status IN ('Upcoming', 'Live', 'Completed', 'Cancelled', 'upcoming', 'ongoing', 'full', 'completed'));
  `);
  console.log('✅ workshops_status_check constraint updated');

  await c.end();
  console.log('🎉 Done!');
}

main().catch(e => { console.error(e); process.exit(1); });
