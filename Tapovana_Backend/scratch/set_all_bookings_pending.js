const { query } = require('../src/config/db');

async function setAllBookingsPending() {
  console.log("=== SETTING ALL BOOKINGS STATUS TO PENDING IN DATABASE ===");

  try {
    const res = await query(`UPDATE bookings SET status = 'PENDING' WHERE status != 'PENDING' OR status IS NULL`);
    console.log(`Successfully updated ${res.rowCount} bookings status to PENDING!`);

    const countRes = await query(`SELECT COUNT(*) FROM bookings WHERE UPPER(status) = 'PENDING'`);
    console.log(`Total Bookings in Database with PENDING Status: ${countRes.rows[0].count}`);

  } catch (e) {
    console.error("Update error:", e);
  }

  process.exit(0);
}

setAllBookingsPending();
