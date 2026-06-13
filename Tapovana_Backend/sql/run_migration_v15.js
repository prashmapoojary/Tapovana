const { query, pool } = require('../src/config/db');

async function run() {
    try {
        console.log('Running v15 migration (Altering allocations table status check constraint)...');

        // 1. Drop the existing allocations_status_check constraint
        await query(`
            ALTER TABLE allocations DROP CONSTRAINT IF EXISTS allocations_status_check;
        `);
        console.log('✅ Old check constraint dropped');

        // 2. Add the updated allocations_status_check constraint to allow Upcoming, Live, Completed, and Cancelled
        await query(`
            ALTER TABLE allocations ADD CONSTRAINT allocations_status_check CHECK (status IN (
                'active', 'expired', 'cancelled', 'removed', 'pending',
                'Upcoming', 'Live', 'Completed', 'Cancelled',
                'upcoming', 'live', 'completed', 'cancelled'
            ));
        `);
        console.log('✅ New allocations status check constraint added successfully');

        // 3. Resync all existing workshops to ensure allocations table is in perfect sync
        const workshopsRes = await query('SELECT id, title, date, time, duration, status, assigned_staff_ids, start_time, end_time FROM workshops');
        console.log(`Syncing allocations for ${workshopsRes.rows.length} workshops...`);

        // We require syncWorkshopAllocations logic here or we can query/update directly.
        // Let's implement the sync logic directly to avoid importing issues
        for (const w of workshopsRes.rows) {
            const workshopId = w.id;
            const isCancelled = w.status === 'Cancelled' || w.status === 'cancelled';

            // Delete old allocations
            await query(`DELETE FROM allocations WHERE type = 'workshop' AND session_id = $1`, [String(workshopId)]);

            if (!isCancelled) {
                const allocationStatus = w.status;
                const staffIds = w.assigned_staff_ids || [];

                for (const staffId of staffIds) {
                    const allocationId = `ws-alloc-${w.id}-${staffId}`;
                    await query(
                        `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
                         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                         ON CONFLICT (id) DO UPDATE SET
                            staff_id = EXCLUDED.staff_id,
                            type = EXCLUDED.type,
                            session_title = EXCLUDED.session_title,
                            session_id = EXCLUDED.session_id,
                            start_date = EXCLUDED.start_date,
                            end_date = EXCLUDED.end_date,
                            booking_time = EXCLUDED.booking_time,
                            duration_minutes = EXCLUDED.duration_minutes,
                            status = EXCLUDED.status`,
                        [
                            allocationId,
                            staffId,
                            'workshop',
                            w.title,
                            String(w.id),
                            w.date,
                            w.date,
                            w.time,
                            w.duration || 60,
                            allocationStatus
                        ]
                    );
                }
            }
        }
        console.log('✅ All workshop allocations synchronized successfully');

        console.log('🟢 v15 migration completed successfully.');
    } catch (err) {
        console.error('❌ Migration failed:', err);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

run();
