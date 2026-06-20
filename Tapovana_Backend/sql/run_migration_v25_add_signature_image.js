const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v25 migration (Adding signature_image to team_members table)...');
        await query(`ALTER TABLE team_members ADD COLUMN IF NOT EXISTS signature_image TEXT;`);
        console.log('✅ signature_image column verified/added to team_members table');
        
        console.log('🟢 v25 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
