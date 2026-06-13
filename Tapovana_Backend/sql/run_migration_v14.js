const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v14 migration (Workshop Time Format, start_time/end_time, customer_email)...');

        // 1. Add start_time, end_time, customer_email columns if they don't exist
        await query(`
            ALTER TABLE workshops 
            ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS end_time TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS customer_email VARCHAR(255);
        `);
        console.log('✅ Columns verified/added to workshops table');

        // 2. Drop existing status check constraint
        await query(`
            ALTER TABLE workshops DROP CONSTRAINT IF EXISTS workshops_status_check;
        `);
        console.log('✅ Old check constraint dropped');

        // 3. Add audit log status_change column if it doesn't exist
        await query(`
            ALTER TABLE workshop_audit_log 
            ADD COLUMN IF NOT EXISTS status_change VARCHAR(100);
        `);
        console.log('✅ Column status_change verified/added to workshop_audit_log');

        // 4. Update status strings globally to capitalized versions
        await query(`
            UPDATE workshops 
            SET status = 'Upcoming' 
            WHERE LOWER(status) = 'upcoming' OR status IS NULL OR status = '';
        `);
        await query(`
            UPDATE workshops 
            SET status = 'Live' 
            WHERE LOWER(status) = 'ongoing' OR LOWER(status) = 'live';
        `);
        await query(`
            UPDATE workshops 
            SET status = 'Completed' 
            WHERE LOWER(status) = 'completed';
        `);
        await query(`
            UPDATE workshops 
            SET status = 'Cancelled' 
            WHERE LOWER(status) = 'cancelled';
        `);
        console.log('✅ Updated status strings globally');

        // 5. Backfill start_time and end_time, and format times to 24-hour clock
        const workshopsRes = await query('SELECT id, date, time, duration FROM workshops');
        for (const w of workshopsRes.rows) {
            let dateStr = w.date;
            if (w.date instanceof Date) {
                const year = w.date.getFullYear();
                const month = String(w.date.getMonth() + 1).padStart(2, '0');
                const day = String(w.date.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            if (dateStr && w.time) {
                // Parse time
                let hours = 0;
                let minutes = 0;
                const match = w.time.match(/(\d+):(\d+)\s*(AM|PM)?/i);
                if (match) {
                    hours = parseInt(match[1], 10);
                    minutes = parseInt(match[2], 10);
                    const ampm = match[3] ? match[3].toUpperCase() : null;
                    if (ampm === 'PM' && hours < 12) hours += 12;
                    if (ampm === 'AM' && hours === 12) hours = 0;
                } else {
                    const parts = w.time.split(':');
                    hours = parseInt(parts[0], 10) || 0;
                    minutes = parseInt(parts[1], 10) || 0;
                }

                // Create date-time in UTC
                const startTime = new Date(dateStr);
                startTime.setHours(hours, minutes, 0, 0);

                const durationMins = w.duration || 60;
                const endTime = new Date(startTime.getTime() + durationMins * 60000);

                await query(
                    `UPDATE workshops 
                     SET start_time = $1, end_time = $2, time = $3 
                     WHERE id = $4`,
                    [
                        startTime.toISOString(),
                        endTime.toISOString(),
                        `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`,
                        w.id
                    ]
                );
            }
        }
        console.log('✅ Backfilled start_time, end_time, and updated time values to 24-hour format');

        // 6. Add new status check constraint
        await query(`
            ALTER TABLE workshops ADD CONSTRAINT workshops_status_check CHECK (status IN ('Upcoming', 'Live', 'Completed', 'Cancelled'));
        `);
        console.log('✅ New check constraint added');

        console.log('🟢 v14 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
