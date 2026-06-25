const { query, pool } = require('../src/config/db');

async function inspect() {
    try {
        console.log('=== SERVICES ===');
        const sRes = await query("SELECT id, name, category FROM services LIMIT 10");
        console.log(sRes.rows);

        console.log('=== BOOKINGS (Service Names) ===');
        const bRes = await query("SELECT service_name, COUNT(*) as cnt FROM bookings GROUP BY service_name");
        console.log(bRes.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

inspect();
