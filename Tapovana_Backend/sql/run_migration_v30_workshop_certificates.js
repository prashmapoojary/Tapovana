const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v30 migration (Creating workshop_certificates table)...');

        // Create table
        await query(`
            CREATE TABLE IF NOT EXISTS workshop_certificates (
                id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                attendee_id     UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
                workshop_id     UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                verification_id VARCHAR(50) UNIQUE NOT NULL,
                instructor_id   UUID NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
                signature_file  VARCHAR(255) NOT NULL,
                pdf_url         VARCHAR(255) NOT NULL,
                issued_date     DATE DEFAULT CURRENT_DATE,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ workshop_certificates table created');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_workshop_certs_verification ON workshop_certificates(verification_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_workshop_certs_lookup ON workshop_certificates(attendee_id, workshop_id);
        `);
        console.log('✅ workshop_certificates indexes created');

        // Trigger for set_updated_at if needed
        await query(`
            DROP TRIGGER IF EXISTS trg_workshop_certificates_updated ON workshop_certificates;
        `);
        await query(`
            CREATE TRIGGER trg_workshop_certificates_updated
                BEFORE UPDATE ON workshop_certificates
                FOR EACH ROW EXECUTE FUNCTION set_updated_at();
        `);
        console.log('✅ trigger created');

        console.log('🟢 v30 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
