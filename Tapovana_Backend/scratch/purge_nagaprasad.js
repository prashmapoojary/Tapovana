const { query } = require('../src/config/db');

async function purgeNagaprasad() {
  console.log("=== PURGING ALL REMAINING NAGAPRASAD ENTRIES FROM DB ===");

  try {
    // 1. Ensure deleted_booking_ids table exists
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_booking_ids (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Search for any row in bookings where ANY column contains nagaprasad or naga
    const targetBookings = await query(`
      SELECT id, user_name, user_email, service_name, total_amount
      FROM bookings
      WHERE LOWER(user_name) LIKE '%nagaprasad%'
         OR LOWER(user_name) LIKE '%naga%'
         OR LOWER(user_email) LIKE '%nagaprasad%'
         OR LOWER(user_email) LIKE '%naga%'
         OR LOWER(service_name) LIKE '%nagaprasad%'
         OR LOWER(service_name) LIKE '%naga%'
    `);

    console.log(`Found ${targetBookings.rows.length} matching nagaprasad bookings:`);
    console.table(targetBookings.rows);

    if (targetBookings.rows.length > 0) {
      const ids = targetBookings.rows.map(r => r.id);
      for (const id of ids) {
        await query(`INSERT INTO deleted_booking_ids (booking_id) VALUES ($1) ON CONFLICT DO NOTHING`, [String(id)]);
      }

      const delB = await query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [ids]);
      console.log(`Deleted ${delB.rowCount} nagaprasad bookings permanently!`);
    }

    // 3. Print remaining clean count
    const countRes = await query('SELECT COUNT(*) FROM bookings');
    console.log(`\nRemaining Clean Bookings Count in DB: ${countRes.rows[0].count}`);

  } catch (e) {
    console.error("Purge error:", e);
  }

  process.exit(0);
}

purgeNagaprasad();
