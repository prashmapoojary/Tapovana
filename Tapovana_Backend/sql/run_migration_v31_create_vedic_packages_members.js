const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v31 migration (Creating vedic_packages_members table)...');

        // Create table
        await query(`
            CREATE TABLE IF NOT EXISTS vedic_packages_members (
                id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                program_id         INTEGER NOT NULL REFERENCES vedic_programs(id) ON DELETE CASCADE,
                name               VARCHAR(100) NOT NULL,
                email              VARCHAR(150) NOT NULL,
                phone              VARCHAR(15) NOT NULL,
                status             VARCHAR(20) DEFAULT 'REGISTERED' CHECK (status IN 
                    ('REGISTERED','CONFIRMED','CHECKED_IN','ATTENDED','ABSENT','CANCELLED')),
                accommodation_type VARCHAR(100) DEFAULT NULL,
                payment_status     VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN 
                    ('PAID','PENDING','PARTIALLY_PAID')),
                check_in_date      DATE DEFAULT NULL,
                check_out_date     DATE DEFAULT NULL,
                vedic_attendee_id  UUID REFERENCES vedic_attendees(id) ON DELETE SET NULL,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ vedic_packages_members table created/verified');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_v_packages_members_program ON vedic_packages_members(program_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_v_packages_members_email ON vedic_packages_members(email);
        `);
        console.log('✅ indexes created on vedic_packages_members');

        // Trigger for set_updated_at
        await query(`
            DROP TRIGGER IF EXISTS trg_vedic_packages_members_updated ON vedic_packages_members;
        `);
        await query(`
            CREATE TRIGGER trg_vedic_packages_members_updated
                BEFORE UPDATE ON vedic_packages_members
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ trigger created for vedic_packages_members');

        console.log('🟢 v31 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
