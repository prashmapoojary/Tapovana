const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v6 migration (vedic_programs and allocations)...');

        // Create vedic_programs table
        await query(`
            CREATE TABLE IF NOT EXISTS vedic_programs (
                id               SERIAL PRIMARY KEY,
                title            VARCHAR(255) NOT NULL,
                type             VARCHAR(50) NOT NULL,
                description      TEXT,
                duration         VARCHAR(20),
                start_date       DATE NOT NULL,
                end_date         DATE NOT NULL,
                capacity         INTEGER DEFAULT 20,
                enrolled         INTEGER DEFAULT 0,
                price            DECIMAL(10, 2),
                accommodations   VARCHAR(255),
                consultant_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
                services         JSONB DEFAULT '[]',
                languages        JSONB DEFAULT '[]',
                image_url        TEXT,
                created_at       TIMESTAMPTZ DEFAULT NOW(),
                updated_at       TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ vedic_programs table verified/created');

        // Create allocations table
        await query(`
            CREATE TABLE IF NOT EXISTS allocations (
                id               VARCHAR(100) PRIMARY KEY,
                staff_id         UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                type             VARCHAR(50) NOT NULL CHECK (type IN ('service', 'workshop', 'vedic_program')),
                session_title    VARCHAR(255) NOT NULL,
                session_id       VARCHAR(100) NOT NULL,
                start_date       TIMESTAMPTZ NOT NULL,
                end_date         TIMESTAMPTZ,
                booking_time     VARCHAR(20),
                duration_minutes INTEGER,
                status           VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired')),
                created_at       TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ allocations table verified/created');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_allocations_staff_date ON allocations(staff_id, start_date);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_allocations_status ON allocations(status);
        `);
        console.log('✅ indexes verified/created');

        // Trigger for vedic_programs
        await query(`
            DROP TRIGGER IF EXISTS trg_vedic_programs_updated ON vedic_programs;
        `);
        await query(`
            CREATE TRIGGER trg_vedic_programs_updated
                BEFORE UPDATE ON vedic_programs
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ triggers verified/created');

        console.log('🟢 v6 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
