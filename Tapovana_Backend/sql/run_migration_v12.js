const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v12 migration (Adding user_email column to bookings table)...');

        // Add user_email column to bookings table
        await query(`
            ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_email VARCHAR(255);
        `);
        console.log('✅ user_email column verified/added to bookings table');

        console.log('🟢 v12 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
