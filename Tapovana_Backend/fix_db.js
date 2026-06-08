const { getClient } = require('./src/config/db');
(async () => {
    try {
        const client = await getClient();
        await client.query("ALTER TABLE otp_verification ALTER COLUMN otp_code TYPE VARCHAR(255)");
        console.log("DB altered successfully");
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
