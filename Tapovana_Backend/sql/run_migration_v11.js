const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v11 migration (Vedic Program Attendees and Registration Deadline)...');

        // Add registration_deadline column to vedic_programs table
        await query(`
            ALTER TABLE vedic_programs ADD COLUMN IF NOT EXISTS registration_deadline DATE;
        `);
        console.log('✅ registration_deadline column verified/added to vedic_programs');

        // Create vedic_program_attendees table
        await query(`
            CREATE TABLE IF NOT EXISTS vedic_program_attendees (
                id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                program_id    INTEGER NOT NULL REFERENCES vedic_programs(id) ON DELETE CASCADE,
                name          VARCHAR(255) NOT NULL,
                email         VARCHAR(255) NOT NULL,
                phone         VARCHAR(20),
                status        VARCHAR(20) DEFAULT 'enrolled' CHECK (status IN ('enrolled', 'attended', 'absent')),
                created_at    TIMESTAMPTZ DEFAULT NOW(),
                updated_at    TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ vedic_program_attendees table verified/created');

        // Create indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_vp_attendees_program ON vedic_program_attendees(program_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_vp_attendees_email ON vedic_program_attendees(email);
        `);
        console.log('✅ indexes created');

        // Create trigger to update updated_at
        await query(`
            DROP TRIGGER IF EXISTS trg_vedic_program_attendees_updated ON vedic_program_attendees;
        `);
        await query(`
            CREATE TRIGGER trg_vedic_program_attendees_updated
                BEFORE UPDATE ON vedic_program_attendees
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ triggers verified/created');

        console.log('🟢 v11 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
