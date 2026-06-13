const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v13 migration (Workshop audit log + completed_notified flag)...');

        // 1. Add completed_notified flag to workshops table
        await query(`
            ALTER TABLE workshops ADD COLUMN IF NOT EXISTS completed_notified BOOLEAN DEFAULT FALSE;
        `);
        console.log('✅ completed_notified column verified/added to workshops table');

        // 2. Create workshop_audit_log table for status change tracking
        await query(`
            CREATE TABLE IF NOT EXISTS workshop_audit_log (
                id SERIAL PRIMARY KEY,
                workshop_id UUID REFERENCES workshops(id) ON DELETE CASCADE,
                old_status VARCHAR(50),
                new_status VARCHAR(50),
                changed_at TIMESTAMPTZ DEFAULT NOW(),
                changed_by VARCHAR(100) DEFAULT 'system'
            );
        `);
        console.log('✅ workshop_audit_log table verified/created');

        console.log('🟢 v13 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
