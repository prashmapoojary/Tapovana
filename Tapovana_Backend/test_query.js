const { query } = require('./src/config/db');

async function test() {
    try {
        const result = await query(`SELECT * FROM workshops ORDER BY created_at DESC LIMIT 5`);
        console.log("Success:", JSON.stringify(result.rows, null, 2));
    } catch (err) {
        console.error("Error:", err);
    }
    process.exit();
}
test();
