const { Client } = require('pg');
const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  const tables = ['services', 'workshops', 'vedic_programs', 'customers', 'bookings', 'transactions'];
  for (const t of tables) {
    const res = await c.query(`SELECT column_name FROM information_schema.columns WHERE table_name = '${t}'`);
    console.log(`\nTable ${t}:`, res.rows.map(r => r.column_name).join(', '));
  }
  await c.end();
}
main();
