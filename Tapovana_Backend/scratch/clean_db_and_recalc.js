const { query } = require('../src/config/db');

async function cleanDatabaseBookings() {
  console.log("=== CLEANING GARBAGE BOOKINGS FROM DATABASE ===");

  try {
    // 1. Ensure deleted_booking_ids table exists
    await query(`
      CREATE TABLE IF NOT EXISTS deleted_booking_ids (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) UNIQUE NOT NULL,
        deleted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 2. Identify garbage booking rows
    const garbageRes = await query(`
      SELECT id, user_name, user_email, service_name, total_amount, membership_tier
      FROM bookings
      WHERE LOWER(service_name) LIKE '%pen%'
         OR LOWER(service_name) LIKE '%gdcsgd%'
         OR LOWER(service_name) LIKE '%fdsfds%'
         OR LOWER(service_name) LIKE '%bhdhbjdsbfjd%'
         OR LOWER(service_name) LIKE '%marker%'
         OR LOWER(service_name) LIKE '%karthik%'
         OR LOWER(service_name) LIKE '%asdasd%'
         OR LOWER(service_name) LIKE '%test%'
         OR service_name IS NULL
         OR LENGTH(TRIM(service_name)) < 3
    `);

    console.log(`Found ${garbageRes.rows.length} garbage booking rows to delete:`);
    for (const r of garbageRes.rows) {
      console.log(` - ID: ${r.id} | User: ${r.user_name} (${r.user_email}) | Service: "${r.service_name}" | Amount: ${r.total_amount}`);
    }

    if (garbageRes.rows.length > 0) {
      const idsToDelete = garbageRes.rows.map(r => r.id);
      
      // Track in deleted_booking_ids
      for (const id of idsToDelete) {
        await query(`INSERT INTO deleted_booking_ids (booking_id) VALUES ($1) ON CONFLICT DO NOTHING`, [String(id)]);
      }

      // Delete from bookings table
      const delRes = await query(`DELETE FROM bookings WHERE id = ANY($1::int[])`, [idsToDelete]);
      console.log(`Successfully deleted ${delRes.rowCount} garbage booking rows!`);
    }

    // 3. Show remaining clean bookings sample
    const cleanRes = await query(`SELECT id, user_name, user_email, service_name, total_amount FROM bookings LIMIT 10`);
    console.log(`\nRemaining Clean Bookings Count: ${(await query('SELECT COUNT(*) FROM bookings')).rows[0].count}`);
    console.log("Sample clean bookings:");
    console.table(cleanRes.rows);

  } catch (e) {
    console.error("Clean error:", e);
  }

  process.exit(0);
}

cleanDatabaseBookings();
