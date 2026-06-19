const { query, pool } = require('./src/config/db');

async function test() {
    try {
        const id = '6026c879-4fb1-45ed-8826-e1344602da53';
        console.log("Checking raw certificate row...");
        const rawRes = await query("SELECT * FROM certificates WHERE certificate_id = $1", [id]);
        console.dir(rawRes.rows, { depth: null });

        console.log("\nRunning downloadCertificate query...");
        const queryBase = `
            SELECT c.certificate_id, c.issued_date, 
                   a.name AS participant_name, 
                   w.title AS workshop_title, w.date AS workshop_date
            FROM certificates c
            JOIN attendees a ON a.id = c.participant_id
            JOIN workshops w ON w.id = c.workshop_id
        `;
        const res = await query(queryBase + ' WHERE c.certificate_id = $1 OR c.participant_id = $1', [id]);
        console.log("Query Results:");
        console.dir(res.rows, { depth: null });
    } catch (err) {
        console.error("Error:", err);
    } finally {
        await pool.end();
    }
}

test();
