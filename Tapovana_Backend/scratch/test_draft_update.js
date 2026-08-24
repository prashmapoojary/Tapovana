const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  console.log('--- 1. Creating Draft Service in Database ---');
  const insertRes = await c.query(`
    INSERT INTO services (name, category, description, base_price, duration_minutes, status)
    VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
  `, ['Draft Herbal Therapy', 'Ayurveda', 'Draft therapy session', 2000, 45, 'DRAFT']);
  const draftService = insertRes.rows[0];
  console.log('✅ Created Draft Service ID:', draftService.id, '| Initial Status:', draftService.status);

  console.log('\n--- 2. Updating Draft Service to ACTIVE (Single Status Field) ---');
  try {
    const fields = ['name = $1', 'base_price = $2', 'status = $3'];
    const values = ['Draft Herbal Therapy - Updated', 2500, 'ACTIVE', draftService.id];
    const updateRes = await c.query(
      `UPDATE services SET ${fields.join(', ')} WHERE id = $4 RETURNING *`,
      values
    );
    console.log('✅ Update Success! New Name:', updateRes.rows[0].name, '| New Status:', updateRes.rows[0].status);
  } catch (err) {
    console.error('❌ Update Failed:', err.message);
  }

  // Cleanup
  await c.query('DELETE FROM services WHERE id = $1', [draftService.id]);
  console.log('Cleaned up test draft.');

  await c.end();
}

main().catch(err => { console.error(err); process.exit(1); });
