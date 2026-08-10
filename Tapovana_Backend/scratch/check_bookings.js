const { query } = require('../src/config/db');

async function checkBookings() {
  const count = await query('SELECT COUNT(*) FROM bookings');
  console.log('Total bookings:', count.rows[0].count);
  
  const schema = await query(`
    SELECT column_name, data_type 
    FROM information_schema.columns 
    WHERE table_name = 'bookings' 
    ORDER BY ordinal_position
  `);
  console.log('\nBookings table schema:');
  schema.rows.forEach(r => console.log(' ', r.column_name, '-', r.data_type));
  
  const sample = await query('SELECT id, user_name, service_name, booking_date, booking_time, status, user_email FROM bookings ORDER BY created_at DESC LIMIT 5');
  console.log('\nRecent bookings:');
  console.log(JSON.stringify(sample.rows, null, 2));
}

checkBookings();
