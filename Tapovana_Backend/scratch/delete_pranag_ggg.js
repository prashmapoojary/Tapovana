const { query } = require('../src/config/db');

async function deletePranagGgg() {
  console.log("=== REMOVING PRANAG / GGG / INVALID SERVICES PERMANENTLY FROM DB ===");

  try {
    // 1. Ensure deleted_booking_ids table exists
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_booking_ids (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Search for any rows matching "pranag", "ggg", "pran", etc. in bookings table
    const targetBookings = await query(`
      SELECT id, user_name, user_email, service_name, total_amount
      FROM bookings
      WHERE LOWER(service_name) LIKE '%pranag%'
         OR LOWER(service_name) LIKE '%ggg%'
         OR LOWER(service_name) LIKE '%pran%'
         OR LOWER(user_name) LIKE '%pranag%'
         OR LOWER(user_name) LIKE '%ggg%'
    `);

    console.log(`Found ${targetBookings.rows.length} matching bookings to delete:`);
    console.table(targetBookings.rows);

    if (targetBookings.rows.length > 0) {
      const ids = targetBookings.rows.map(r => r.id);
      for (const id of ids) {
        await query(`INSERT INTO deleted_booking_ids (booking_id) VALUES ($1) ON CONFLICT DO NOTHING`, [String(id)]);
      }

      const delB = await query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [ids]);
      console.log(`Deleted ${delB.rowCount} bookings permanently!`);
    }

    // 3. Also check services table just in case
    const targetServices = await query(`
      SELECT id, name FROM services
      WHERE LOWER(name) LIKE '%pranag%'
         OR LOWER(name) LIKE '%ggg%'
         OR LOWER(name) LIKE '%pran%'
    `);

    if (targetServices.rows.length > 0) {
      console.log(`Found ${targetServices.rows.length} matching services to delete:`);
      console.table(targetServices.rows);
      const sIds = targetServices.rows.map(r => r.id);
      const delS = await query(`DELETE FROM services WHERE id = ANY($1::uuid[])`, [sIds]);
      console.log(`Deleted ${delS.rowCount} services permanently!`);
    }

    // 4. Print clean booking count
    const countRes = await query('SELECT COUNT(*) FROM bookings');
    console.log(`\nRemaining Clean Bookings Count in DB: ${countRes.rows[0].count}`);

  } catch (e) {
    console.error("Deletion error:", e);
  }

  process.exit(0);
}

deletePranagGgg();
