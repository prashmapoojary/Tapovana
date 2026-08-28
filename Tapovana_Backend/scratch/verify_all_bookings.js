const { getAllBookings } = require('../src/controllers/bookingsController');

async function testGetAllBookings() {
  console.log("=== VERIFYING GET ALL BOOKINGS CONTROLLER OUTPUT ===");
  const req = { query: { page: 1, limit: 10 } };
  const res = {
    json: (data) => {
      console.log("SUCCESS:", data.success);
      console.log("TOTAL BOOKINGS COUNT:", data.pagination?.total || data.count);
      console.log("\n--- FIRST 5 BOOKINGS RETURNED TO FRONTEND ---");
      const sample = (data.bookings || []).slice(0, 5).map(b => ({
        id: b.id,
        user_name: b.user_name,
        user_email: b.user_email || b.email,
        service_name: b.service_name,
        status: b.status,
        membership_tier: b.membership_tier,
        final_price: b.final_price
      }));
      console.table(sample);
      process.exit(0);
    },
    status: (code) => ({ json: (data) => console.log(`STATUS ${code}:`, data) })
  };

  await getAllBookings(req, res);
}

testGetAllBookings();
