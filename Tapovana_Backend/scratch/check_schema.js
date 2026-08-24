const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  await c.query('SET search_path TO public;');
  console.log('Connected!\n');

  // 1. Check all existing tables
  const tables = await c.query(`
    SELECT table_name FROM information_schema.tables 
    WHERE table_schema = 'public' ORDER BY table_name;
  `);
  console.log('=== EXISTING TABLES ===');
  tables.rows.forEach(r => console.log(' -', r.table_name));

  // 2. Check workshops columns
  console.log('\n=== WORKSHOPS COLUMNS ===');
  const wCols = await c.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'workshops' AND table_schema = 'public' ORDER BY ordinal_position;
  `);
  wCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

  // 3. Check vedic_programs columns
  console.log('\n=== VEDIC_PROGRAMS COLUMNS ===');
  const vpCols = await c.query(`
    SELECT column_name, data_type FROM information_schema.columns 
    WHERE table_name = 'vedic_programs' AND table_schema = 'public' ORDER BY ordinal_position;
  `);
  vpCols.rows.forEach(r => console.log(` - ${r.column_name} (${r.data_type})`));

  await c.end();
}

main().catch(e => { console.error(e); process.exit(1); });
