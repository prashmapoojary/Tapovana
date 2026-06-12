const { query, pool } = require('./src/config/db');

async function run() {
    try {
        console.log('Querying workshops column sizes...');
        const res = await query(`
            SELECT id, title, 
                   LENGTH(image_url) AS image_len, 
                   LENGTH(video_url) AS video_len,
                   LEFT(image_url, 30) AS image_start,
                   LEFT(video_url, 30) AS video_start
            FROM workshops
        `);
        console.log('Column sizes for workshops in DB:');
        console.table(res.rows);
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await pool.end();
    }
}

run();
