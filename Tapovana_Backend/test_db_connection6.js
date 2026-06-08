const { Pool } = require('pg');
require('dotenv').config();

const url = process.env.DATABASE_URL.split('?')[0];

const pool = new Pool({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

(async () => {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT 1 as val");
        console.log("Connection successful with rejectUnauthorized: false", res.rows);
        client.release();
        process.exit(0);
    } catch (e) {
        console.error("Connection failed:", e);
        process.exit(1);
    }
})();
