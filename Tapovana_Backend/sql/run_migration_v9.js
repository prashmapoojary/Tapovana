const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v9 migration (attendees)...');

        // Create attendees table
        await query(`
            CREATE TABLE IF NOT EXISTS attendees (
                id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                workshop_id UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                name        VARCHAR(255) NOT NULL,
                email       VARCHAR(255) NOT NULL,
                phone       VARCHAR(50),
                status      VARCHAR(50) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'absent')),
                created_at  TIMESTAMPTZ DEFAULT NOW(),
                updated_at  TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ attendees table verified/created');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_attendees_workshop_id ON attendees(workshop_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_attendees_email ON attendees(email);
        `);
        console.log('✅ indexes verified/created');

        // Triggers
        await query(`
            DROP TRIGGER IF EXISTS trg_attendees_updated ON attendees;
        `);
        await query(`
            CREATE TRIGGER trg_attendees_updated
                BEFORE UPDATE ON attendees
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ triggers verified/created');

        console.log('🟢 v9 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
