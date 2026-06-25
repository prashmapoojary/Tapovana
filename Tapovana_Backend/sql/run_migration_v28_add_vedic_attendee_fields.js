const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v28 migration (add vedic attendee accommodation, payment & stay details)...');

        // 1. Add accommodation_type column to vedic_program_attendees table
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS accommodation_type VARCHAR(100) DEFAULT NULL;
        `);
        console.log('✅ accommodation_type column verified/added');

        // 2. Add payment_status column to vedic_program_attendees table
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'Pending' CHECK (payment_status IN ('Paid', 'Pending', 'Partially Paid'));
        `);
        console.log('✅ payment_status column verified/added');

        // 3. Add checkin_date column to vedic_program_attendees table
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS checkin_date DATE DEFAULT NULL;
        `);
        console.log('✅ checkin_date column verified/added');

        // 4. Add checkout_date column to vedic_program_attendees table
        await query(`
            ALTER TABLE vedic_program_attendees ADD COLUMN IF NOT EXISTS checkout_date DATE DEFAULT NULL;
        `);
        console.log('✅ checkout_date column verified/added');

        console.log('🟢 v28 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
