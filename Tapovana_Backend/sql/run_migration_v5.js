const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        await client.connect();
        console.log('Connected to database. Running bookings migration...');

        await client.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id               SERIAL PRIMARY KEY,
        user_name        VARCHAR(255) NOT NULL,
        profile_pic      TEXT,
        service_name     VARCHAR(255),
        booking_date     TIMESTAMPTZ,
        booking_time     VARCHAR(20),
        therapist_name   VARCHAR(255),
        therapist_id     UUID REFERENCES team_members(id) ON DELETE SET NULL,
        note             TEXT,
        total_amount     VARCHAR(100),
        pass_details     TEXT,
        payment_status   VARCHAR(20) DEFAULT 'PENDING'
                          CHECK (payment_status IN ('PAID','PENDING','FAILED','REFUNDED')),
        status           VARCHAR(20) DEFAULT 'PENDING'
                          CHECK (status IN ('PENDING','CONFIRMED','COMPLETED','CANCELLED')),
        created_at       TIMESTAMPTZ DEFAULT NOW(),
        updated_at       TIMESTAMPTZ DEFAULT NOW()
      );
    `);
        console.log('✅ bookings table created');

        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_date ON bookings(booking_date);
    `);
        await client.query(`
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    `);
        console.log('✅ indexes created');

        await client.query(`
      DROP TRIGGER IF EXISTS trg_bookings_updated ON bookings;
    `);
        await client.query(`
      CREATE TRIGGER trg_bookings_updated
        BEFORE UPDATE ON bookings
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
        console.log('✅ trigger created');

        console.log('✅ Bookings schema applied successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await client.end();
    }
}

run();