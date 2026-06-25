const { query, pool } = require('../src/config/db');

async function showTables() {
    try {
        console.log('=== SHOWING DATABASE TABLES AND COLUMNS ===');
        const res = await query(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        for (const row of res.rows) {
            console.log(`\nTable: ${row.table_name}`);
            const cols = await query(`
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = $1
                ORDER BY ordinal_position;
            `, [row.table_name]);
            for (const col of cols.rows) {
                console.log(`  - ${col.column_name}: ${col.data_type}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

showTables();
