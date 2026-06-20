const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v26 migration (Re-creating certificates table with custom schema)...');

        // Drop existing table if any
        await query(`DROP TABLE IF EXISTS certificates CASCADE;`);

        // Create table
        await query(`
            CREATE TABLE certificates (
                id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                certificate_id   VARCHAR(100) UNIQUE NOT NULL,
                participant_id   UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
                participant_name VARCHAR(255) NOT NULL,
                workshop_id      UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                workshop_name    VARCHAR(255) NOT NULL,
                instructor_id    UUID REFERENCES team_members(id) ON DELETE SET NULL,
                pdf_url          TEXT NOT NULL,
                generated_at     TIMESTAMPTZ DEFAULT NOW(),
                completion_date  DATE NOT NULL
            );
        `);
        console.log('✅ certificates table created with custom fields');

        // Indexes
        await query(`
            CREATE INDEX IF NOT EXISTS idx_certificates_cert_id ON certificates(certificate_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_certificates_lookup ON certificates(participant_id, workshop_id);
        `);
        console.log('✅ certificates indexes created');

        console.log('🟢 v26 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
