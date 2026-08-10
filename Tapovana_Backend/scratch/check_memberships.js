const { query } = require('../src/config/db');

async function checkMembershipsTable() {
  const result = await query('SELECT id, name, email, phone, tier, status, profile_photo_url FROM memberships LIMIT 10');
  console.log('Memberships table columns & data:');
  console.log(JSON.stringify(result.rows, null, 2));
  
  // Check table schema
  const schema = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'memberships' 
    ORDER BY ordinal_position
  `);
  console.log('\nTable schema:');
  schema.rows.forEach(r => console.log(r.column_name, '-', r.data_type));
}

checkMembershipsTable();
