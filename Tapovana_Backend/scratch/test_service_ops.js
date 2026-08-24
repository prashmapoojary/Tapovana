const { Client } = require('pg');

const c = new Client({
  connectionString: 'postgresql://neondb_owner:npg_9J7lqUbeAarM@ep-cold-snow-axc6fc35-pooler.c-4.us-east-2.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  await c.connect();
  console.log('--- Inspecting Services Columns ---');
  const cols = await c.query("SELECT column_name, data_type, udt_name FROM information_schema.columns WHERE table_name = 'services'");
  console.log(cols.rows);

  console.log('\n--- Testing Service Insert ---');
  try {
    const res = await c.query(`
      INSERT INTO services (name, category, description, base_price, duration_minutes, status)
      VALUES ($1, $2, $3, $4, $5, $6) RETURNING *
    `, ['Test Service', 'Ayurveda', 'Test Description', 1500, 30, 'ACTIVE']);
    console.log('Insert Success:', res.rows[0].id);

    console.log('\n--- Testing Service Update ---');
    const updateRes = await c.query(`
      UPDATE services SET name = $1 WHERE id = $2 RETURNING *
    `, ['Updated Test Service', res.rows[0].id]);
    console.log('Update Success:', updateRes.rows[0].name);

    // Clean up test row
    await c.query('DELETE FROM services WHERE id = $1', [res.rows[0].id]);
  } catch (err) {
    console.error('Operation Failed:', err);
  }

  await c.end();
}

main();
