const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v29 migration (create vedic_attendees table)...');

        // 1. Create the new vedic_attendees table
        await query(`
            CREATE TABLE IF NOT EXISTS vedic_attendees (
                id                 UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
                program_id         INTEGER NOT NULL REFERENCES vedic_programs(id) ON DELETE CASCADE,
                name               VARCHAR(100) NOT NULL,
                email              VARCHAR(150) NOT NULL,
                phone              VARCHAR(15) NOT NULL,
                status             VARCHAR(20) DEFAULT 'REGISTERED' CHECK (status IN 
                    ('REGISTERED','CONFIRMED','CHECKED_IN','ATTENDED','ABSENT','CANCELLED')),
                accommodation_type VARCHAR(100),
                payment_status     VARCHAR(20) DEFAULT 'PENDING' CHECK (payment_status IN 
                    ('PAID','PENDING','PARTIALLY_PAID')),
                check_in_date      DATE,
                check_out_date     DATE,
                source             VARCHAR(10) DEFAULT 'admin' CHECK (source IN ('admin', 'mobile')),
                checked_in_at      TIMESTAMPTZ,
                created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ vedic_attendees table verified/created');

        // Create indexes on the new table
        await query(`
            CREATE INDEX IF NOT EXISTS idx_v_attendees_program ON vedic_attendees(program_id);
        `);
        await query(`
            CREATE INDEX IF NOT EXISTS idx_v_attendees_email ON vedic_attendees(email);
        `);
        console.log('✅ indexes created on vedic_attendees');

        // 2. Migrate existing data if old table exists
        const checkTable = await query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'vedic_program_attendees')");
        if (checkTable.rows[0].exists) {
            const existing = await query("SELECT * FROM vedic_program_attendees");
            for (const row of existing.rows) {
                // Map status to uppercase
                let statusUpper = 'REGISTERED';
                if (row.status) {
                    const s = row.status.toLowerCase();
                    if (s === 'registered') statusUpper = 'REGISTERED';
                    else if (s === 'confirmed') statusUpper = 'CONFIRMED';
                    else if (s === 'checked_in') statusUpper = 'CHECKED_IN';
                    else if (s === 'attended') statusUpper = 'ATTENDED';
                    else if (s === 'absent') statusUpper = 'ABSENT';
                    else if (s === 'cancelled') statusUpper = 'CANCELLED';
                }
                // Map payment_status to uppercase
                let paymentUpper = 'PENDING';
                if (row.payment_status) {
                    const p = row.payment_status.toLowerCase();
                    if (p === 'paid') paymentUpper = 'PAID';
                    else if (p === 'pending') paymentUpper = 'PENDING';
                    else if (p === 'partially paid' || p === 'partially_paid') paymentUpper = 'PARTIALLY_PAID';
                }
                await query(
                    `INSERT INTO vedic_attendees (id, program_id, name, email, phone, status, accommodation_type, payment_status, check_in_date, check_out_date, source, checked_in_at, created_at, updated_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
                     ON CONFLICT (id) DO NOTHING`,
                    [row.id, row.program_id, row.name, row.email, row.phone || '', statusUpper, row.accommodation_type, paymentUpper, row.checkin_date, row.checkout_date, row.source || 'admin', row.checked_in_at, row.created_at, row.updated_at]
                );
            }
            console.log(`✅ Migrated ${existing.rows.length} attendee records to vedic_attendees.`);
            
            // Drop old table to clean up
            await query("DROP TABLE IF EXISTS vedic_program_attendees CASCADE");
            console.log('✅ Old vedic_program_attendees table dropped');
        }

        console.log('🟢 v29 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
