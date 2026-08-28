const { query } = require('../src/config/db');

async function addIndexes() {
  console.log("⚡ Creating database performance indexes...");
  try {
    const indexes = [
      "CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status)",
      "CREATE INDEX IF NOT EXISTS idx_bookings_booking_date ON bookings(booking_date)",
      "CREATE INDEX IF NOT EXISTS idx_bookings_service_name ON bookings(service_name)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status)",
      "CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at)",
      "CREATE INDEX IF NOT EXISTS idx_customers_membership_status ON customers(membership_status)",
      "CREATE INDEX IF NOT EXISTS idx_services_status ON services(status)",
      "CREATE INDEX IF NOT EXISTS idx_workshops_status ON workshops(status)",
      "CREATE INDEX IF NOT EXISTS idx_blogs_status ON blogs(status)"
    ];

    for (const sql of indexes) {
      try {
        await query(sql);
        console.log(`✅ Index executed: ${sql}`);
      } catch (err) {
        console.warn(`⚠️ Index creation warning: ${err.message}`);
      }
    }

    console.log("🚀 All performance indexes successfully checked/created.");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding indexes:", err);
    process.exit(1);
  }
}

addIndexes();
