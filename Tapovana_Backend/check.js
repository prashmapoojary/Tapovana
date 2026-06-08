const { getClient } = require('./src/config/db');
(async () => {
    try {
        const client = await getClient();
        const res = await client.query("SELECT character_maximum_length FROM information_schema.columns WHERE table_name = 'otp_verification' AND column_name = 'otp_code'");
        console.log(res.rows);
        
        // Let's also test if updating otp_code throws an error
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
