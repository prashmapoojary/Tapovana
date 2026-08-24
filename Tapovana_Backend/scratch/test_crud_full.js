const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();

  console.log('--- Testing Full Service Creation ---');
  const insertRes = await c.query(`
    INSERT INTO services (name, category, subcategory, description, base_price, duration_minutes, benefits, required_certification, experience_level, tools, image_url, status, assigned_staff_ids, assigned_staff_details)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *
  `, [
    'Test Abhyanga Renewal', 'Ayurveda', 'Therapy', 'A full body rejuvenation therapy.',
    3500.00, 60, 'Stress relief', 'Ayurveda Cert', 'Expert', 'Oil Pouring Pot',
    '/uploads/service1.jpg', 'ACTIVE', JSON.stringify([]), JSON.stringify([])
  ]);
  const newService = insertRes.rows[0];
  console.log('✅ Created Service ID:', newService.id);

  console.log('\n--- Testing Full Service Update ---');
  const updateRes = await c.query(`
    UPDATE services 
    SET name = $1, base_price = $2, assigned_staff_details = $3
    WHERE id = $4
    RETURNING *
  `, ['Test Abhyanga Renewal - Updated', 3800.00, JSON.stringify([{ id: 'test', name: 'Dr. Test' }]), newService.id]);
  console.log('✅ Updated Service Name:', updateRes.rows[0].name, '| New Price:', updateRes.rows[0].base_price);

  // Clean up
  await c.query('DELETE FROM services WHERE id = $1', [newService.id]);
  console.log('✅ Test Service cleaned up');

  await c.end();
}

main().catch(err => { console.error('CRUD Test Failed:', err); process.exit(1); });
