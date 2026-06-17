const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v21 migration (Adding local_path to unsplash_media table)...');

        // Alter table to add local_path
        await query(`
            ALTER TABLE unsplash_media 
            ADD COLUMN IF NOT EXISTS local_path TEXT;
        `);
        console.log('✅ local_path column verified/created');

        console.log('🟢 v21 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
