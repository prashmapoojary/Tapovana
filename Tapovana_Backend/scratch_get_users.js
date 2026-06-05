const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: false
});

async function run() {
    try {
        await client.connect();
        const res = await client.query('SELECT tm.first_name, tm.last_name, tm.email, r.name as role FROM team_members tm JOIN roles r ON r.id = tm.role_id');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

run();
