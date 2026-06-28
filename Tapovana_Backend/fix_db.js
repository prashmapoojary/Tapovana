const { getClient } = require('./src/config/db');
(async () => {
    try {
        const client = await getClient();
        
        console.log("Updating certificates table...");
        const res1 = await client.query(`
            UPDATE certificates
            SET pdf_url = 'https://tapovana.onrender.com/api/certificates/download/' || certificate_id
            WHERE pdf_url LIKE 'http://192.168.%'
               OR pdf_url LIKE 'http://localhost%'
               OR pdf_url LIKE 'http://10.%'
               OR pdf_url LIKE 'http://127.0.0.1%';
        `);
        console.log(`Updated ${res1.rowCount} rows in certificates table.`);

        console.log("Updating workshop_certificates table...");
        const res2 = await client.query(`
            UPDATE workshop_certificates
            SET pdf_url = 'https://tapovana.onrender.com/api/workshops/' || workshop_id || '/certificates/' || verification_id
            WHERE pdf_url LIKE 'http://192.168.%'
               OR pdf_url LIKE 'http://localhost%'
               OR pdf_url LIKE 'http://10.%'
               OR pdf_url LIKE 'http://127.0.0.1%';
        `);
        console.log(`Updated ${res2.rowCount} rows in workshop_certificates table.`);

        console.log("DB updated successfully");
        process.exit(0);
    } catch (e) {
        console.error("Failed to update DB:", e);
        process.exit(1);
    }
})();

