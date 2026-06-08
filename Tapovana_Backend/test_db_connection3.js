const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 30000,
});

(async () => {
    try {
        const client = await pool.connect();
        const res = await client.query("SELECT 1 as val");
        console.log("Connection successful:", res.rows);
        client.release();
        process.exit(0);
    } catch (e) {
        console.error("Connection failed:", e);
        process.exit(1);
    }
})();
