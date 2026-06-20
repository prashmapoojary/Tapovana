const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v24 migration (Re-creating certificates table)...');

        // Create table
        await query(`
            CREATE TABLE IF NOT EXISTS certificates (
                certificate_id   UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                participant_id   UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
                workshop_id      UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                certificate_url  TEXT NOT NULL,
                issued_date      TIMESTAMPTZ DEFAULT NOW(),
                UNIQUE(participant_id, workshop_id)
            );
        `);
        console.log('✅ certificates table verified/created');

        // Index
        await query(`
            CREATE INDEX IF NOT EXISTS idx_certificates_lookup 
            ON certificates(participant_id, workshop_id);
        `);
        console.log('✅ certificates lookup index verified/created');

        console.log('🟢 v24 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
