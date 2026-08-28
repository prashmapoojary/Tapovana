const { query } = require('../src/config/db');
const bookingsController = require('../src/controllers/bookingsController');

async function testBookingsFlow() {
  console.log("🧪 Testing Full Bookings Flow & Rules...");

  // 1. Create a Mobile Booking
  console.log("\n1️⃣ Creating Mobile Booking...");
  const fakeReqCreate = {
    body: {
      user_name: "Mobile Test User",
      service_name: "Abhyanga Therapy",
      booking_date: "2026-09-01",
      booking_time: "10:00 AM",
      total_amount: 2500,
      user_email: "mobile.test@example.com",
      status: "PENDING"
    }
  };

  let createdBookingId = null;
  const fakeResCreate = {
    status: (code) => ({
      json: (d) => {
        console.log("   Create Booking Status:", code);
        if (d.booking) createdBookingId = d.booking.id;
      }
    }),
    json: (d) => {
      console.log("   Create Booking Response:", d.message || d.success);
      if (d.booking) createdBookingId = d.booking.id;
    }
  };

  await bookingsController.createBooking(fakeReqCreate, fakeResCreate);

  if (!createdBookingId) {
    console.error("❌ Failed to create test booking.");
    process.exit(1);
  }

  console.log(`✅ Mobile Booking Created with ID: ${createdBookingId}`);

  // 2. Fetch All Bookings (Admin side sync check)
  console.log("\n2️⃣ Fetching All Bookings (Admin Sync Check)...");
  const fakeReqGet = {
    query: { limit: '10' }
  };
  const fakeResGet = {
    status: (code) => ({ json: (d) => console.log("   Get Bookings Status:", code, "Count:", d.bookings?.length) }),
    json: (d) => console.log("   Get Bookings Count:", d.bookings?.length)
  };
  await bookingsController.getAllBookings(fakeReqGet, fakeResGet);

  // 3. Test Rule: Try Confirming WITHOUT allocating staff (Should FAIL)
  console.log("\n3️⃣ Testing Rule: Confirm WITHOUT allocating staff (Should FAIL)...");
  const fakeReqFailConfirm = {
    params: { id: createdBookingId },
    body: { status: "CONFIRMED", staff_ids: [] }
  };
  const fakeResFailConfirm = {
    status: (code) => ({
      json: (d) => console.log("   Confirmation without staff blocked as expected! Code:", code, "Message:", d.message)
    }),
    json: (d) => console.log("   Response:", d.message)
  };
  await bookingsController.updateBookingStatus(fakeReqFailConfirm, fakeResFailConfirm);

  // 4. Find a valid Doctor/Therapist staff member ID
  const staffRes = await query("SELECT tm.id, tm.first_name, tm.last_name FROM team_members tm JOIN roles r ON r.id = tm.role_id WHERE UPPER(r.name) IN ('DOCTOR', 'THERAPIST') LIMIT 1");
  if (!staffRes.rows.length) {
    console.log("⚠️ No doctor/therapist found in DB. Skipping staff allocation test.");
  } else {
    const staffId = staffRes.rows[0].id;
    const staffName = `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`.trim();
    console.log(`\n4️⃣ Assigning Staff (${staffName}, ID: ${staffId}) & Confirming Booking...`);

    const fakeReqConfirm = {
      params: { id: createdBookingId },
      body: { status: "CONFIRMED", staff_ids: [staffId], skip_notify: true }
    };
    const fakeResConfirm = {
      status: (code) => ({
        json: (d) => console.log("   Confirm Status:", code, "Message:", d.message || d.success)
      }),
      json: (d) => console.log("   Confirm Response:", d.message || d.success)
    };
    await bookingsController.updateBookingStatus(fakeReqConfirm, fakeResConfirm);

    // Verify DB status after confirmation
    const dbCheckConfirm = await query("SELECT status, therapist_id FROM bookings WHERE id = $1", [createdBookingId]);
    console.log("   DB Check after confirmation:", dbCheckConfirm.rows[0]);
  }

  // 5. Delete Booking
  console.log(`\n5️⃣ Deleting Booking (ID: ${createdBookingId})...`);
  const fakeReqDelete = {
    params: { id: createdBookingId }
  };
  const fakeResDelete = {
    status: (code) => ({
      json: (d) => console.log("   Delete Status:", code, "Message:", d.message || d.success)
    }),
    json: (d) => console.log("   Delete Response:", d.message || d.success)
  };
  await bookingsController.deleteBooking(fakeReqDelete, fakeResDelete);

  // Check DB directly after delete
  const dbCheckDelete = await query("SELECT * FROM bookings WHERE id = $1", [createdBookingId]);
  console.log("   DB Check after delete:", dbCheckDelete.rows.length === 0 ? "DELETED FROM DB ✅" : "STILL EXISTS ❌");

  process.exit(0);
}

testBookingsFlow().catch(err => {
  console.error("❌ Error in bookings test:", err);
  process.exit(1);
});
