const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v22 migration (Creating media_assets table)...');

        // Create media_assets table
        await query(`
            CREATE TABLE IF NOT EXISTS media_assets (
                id SERIAL PRIMARY KEY,
                source VARCHAR(20),
                url TEXT,
                type VARCHAR(10),
                category VARCHAR(50),
                created_at TIMESTAMP DEFAULT NOW()
            );
        `);
        console.log('✅ media_assets table verified/created');

        console.log('🟢 v22 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
