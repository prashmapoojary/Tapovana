const { query } = require('./src/config/db');

async function migrate() {
    try {
        await query(`ALTER TABLE services ADD COLUMN IF NOT EXISTS assigned_staff_details JSONB DEFAULT '[]'::jsonb`);
        console.log("Migration successful: Added assigned_staff_details column to services table.");
    } catch (err) {
        console.error("Migration error:", err);
    }
    process.exit();
}
migrate();
