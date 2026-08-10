require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { query } = require('../src/config/db');

async function syncBookings() {
  console.log('Fetching bookings from mobile backend...');
  const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=500');
  const data = await response.json();
  const remoteBookings = data.success ? (data.bookings || []) : [];
  console.log('Remote bookings found:', remoteBookings.length);

  if (remoteBookings.length === 0) { process.exit(0); }

  const existingRes = await query("SELECT id FROM bookings");
  const existingIds = new Set(existingRes.rows.map(r => String(r.id)));

  let inserted = 0;
  for (const rb of remoteBookings) {
    if (existingIds.has(String(rb.id))) continue;
    const bookingStatus = rb.status || 'PENDING';
    const therapist = (rb.therapist_name === 'Not Assigned' || !rb.therapist_name) ? null : rb.therapist_name;
    const userEmail = rb.user_email || rb.email || null;
    await query(
      'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) ON CONFLICT (id) DO NOTHING',
      [rb.id, rb.user_name, rb.service_name, rb.booking_date, rb.booking_time, therapist,
       rb.note, rb.total_amount, rb.pass_details, 'PAID', bookingStatus, rb.created_at, userEmail, rb.profile_pic || null]
    );
    inserted++;
  }

  console.log(`Inserted ${inserted} new bookings.`);
  const count = await query('SELECT COUNT(*) FROM bookings');
  console.log('Total bookings in DB now:', count.rows[0].count);
  process.exit(0);
}

syncBookings().catch(e => { console.error(e); process.exit(1); });
