const { query } = require('../src/config/db');

async function deleteSpecificTestBookings() {
  console.log("=== REMOVING NAGAPRASAD, HHHH, PALLAVI BOOKINGS FROM DB ===");

  try {
    // 1. Ensure deleted_booking_ids table exists
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_booking_ids (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Query bookings matching nagaprasad, hhhh, pallavi
    const targetBookings = await query(`
      SELECT id, user_name, user_email, service_name, total_amount
      FROM bookings
      WHERE LOWER(service_name) LIKE '%nagaprasad%'
         OR LOWER(service_name) LIKE '%hhhh%'
         OR LOWER(service_name) LIKE '%pallavi%'
         OR LOWER(service_name) LIKE '%hhh%'
         OR LOWER(service_name) LIKE '%naga%'
    `);

    console.log(`Found ${targetBookings.rows.length} matching test bookings to delete:`);
    console.table(targetBookings.rows);

    if (targetBookings.rows.length > 0) {
      const ids = targetBookings.rows.map(r => r.id);
      
      // Blacklist IDs so they never resync
      for (const id of ids) {
        await query(`INSERT INTO deleted_booking_ids (booking_id) VALUES ($1) ON CONFLICT DO NOTHING`, [String(id)]);
      }

      // Delete from bookings table
      const delB = await query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [ids]);
      console.log(`Successfully deleted ${delB.rowCount} test bookings permanently!`);
    }

    // 3. Also check services table if any test services exist with these names
    const targetServices = await query(`
      SELECT id, name FROM services
      WHERE LOWER(name) LIKE '%nagaprasad%'
         OR LOWER(name) LIKE '%hhhh%'
         OR LOWER(name) LIKE '%pallavi%'
    `);

    if (targetServices.rows.length > 0) {
      console.log(`Found ${targetServices.rows.length} matching test services to delete:`);
      console.table(targetServices.rows);
      const sIds = targetServices.rows.map(r => r.id);
      const delS = await query(`DELETE FROM services WHERE id = ANY($1::uuid[])`, [sIds]);
      console.log(`Deleted ${delS.rowCount} test services permanently!`);
    }

    // 4. Print clean booking count
    const countRes = await query('SELECT COUNT(*) FROM bookings');
    console.log(`\nRemaining Clean Bookings Count in DB: ${countRes.rows[0].count}`);

  } catch (e) {
    console.error("Deletion error:", e);
  }

  process.exit(0);
}

deleteSpecificTestBookings();
