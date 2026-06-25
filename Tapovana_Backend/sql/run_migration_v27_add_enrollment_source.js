const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v27 migration (add enrollment source & certificate eligibility)...');

        // 1. Add source column to attendees table
        await query(`
            ALTER TABLE attendees ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'admin' CHECK (source IN ('admin', 'mobile'));
        `);
        console.log('✅ source column verified/added to attendees');

        // 2. Add certificate_eligible column to attendees table
        await query(`
            ALTER TABLE attendees ADD COLUMN IF NOT EXISTS certificate_eligible BOOLEAN DEFAULT TRUE;
        `);
        console.log('✅ certificate_eligible column verified/added to attendees');

        // 3. Add source column to vedic_program_attendees table
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'admin' CHECK (source IN ('admin', 'mobile'));
        `);
        console.log('✅ source column verified/added to vedic_program_attendees');

        // 4. Backfill existing records
        await query(`
            UPDATE attendees SET source = 'admin' WHERE source IS NULL;
        `);
        await query(`
            UPDATE attendees SET certificate_eligible = TRUE WHERE certificate_eligible IS NULL;
        `);
        await query(`
            UPDATE vedic_program_attendees SET source = 'admin' WHERE source IS NULL;
        `);
        console.log('✅ backfilled existing records');

        console.log('🟢 v27 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
