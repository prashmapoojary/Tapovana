const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running migration (Dropping certificates table)...');
        await query(`DROP TABLE IF EXISTS certificates CASCADE;`);
        console.log('✅ certificates table dropped successfully');
        console.log('🟢 Migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
