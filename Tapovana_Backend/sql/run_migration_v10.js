const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v10 migration (workshop_videos and columns)...');

        // Add columns to workshops table
        await query(`
            ALTER TABLE workshops ADD COLUMN IF NOT EXISTS allocation_count INTEGER DEFAULT 0;
        `);
        await query(`
            ALTER TABLE workshops ADD COLUMN IF NOT EXISTS upcoming_notified BOOLEAN DEFAULT FALSE;
        `);
        await query(`
            ALTER TABLE workshops ADD COLUMN IF NOT EXISTS ongoing_notified BOOLEAN DEFAULT FALSE;
        `);
        console.log('Refreshed workshops table columns');

        // Create workshop_videos table
        await query(`
            CREATE TABLE IF NOT EXISTS workshop_videos (
                id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                workshop_id   UUID NOT NULL REFERENCES workshops(id) ON DELETE CASCADE,
                chunk_index   INTEGER NOT NULL,
                chunk_size    INTEGER NOT NULL,
                byte_offset   BIGINT NOT NULL,
                total_size    BIGINT NOT NULL,
                data          BYTEA NOT NULL,
                filename      VARCHAR(255),
                mime_type     VARCHAR(100),
                created_at    TIMESTAMPTZ DEFAULT NOW()
            );
        `);
        console.log('✅ workshop_videos table verified/created');

        // Create unique index
        await query(`
            CREATE UNIQUE INDEX IF NOT EXISTS idx_workshop_videos_workshop_chunk 
            ON workshop_videos(workshop_id, chunk_index);
        `);
        console.log('✅ unique index on workshop_videos created');

        console.log('🟢 v10 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
