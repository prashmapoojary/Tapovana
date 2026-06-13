const { query } = require('../src/config/db');

async function run() {
    try {
        const res = await query("SELECT id, name, image_url FROM services");
        console.log("Services in DB:");
        res.rows.forEach(row => {
            console.log(`- ID: ${row.id}, Name: ${row.name}, Image URL: ${row.image_url}`);
        });
    } catch (err) {
        console.error("Error:", err.message);
    }
}
run();
