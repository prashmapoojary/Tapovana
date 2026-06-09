const { query } = require('../config/db');
const { sendBookingStatusEmail, sendBookingAllocationEmail, sendBookingRemovalEmail } = require('../services/emailService');
const { checkStaffAllocationConflict, syncStaffMemberStatus } = require('../utils/conflictChecker');

// Ensure booking_status_updates table exists
const ensureUpdatesTableExists = async () => {
    try {
        const colRes = await query(`
            SELECT data_type 
            FROM information_schema.columns 
            WHERE table_name = 'booking_status_updates' AND column_name = 'booking_id'
        `);
        if (colRes.rows.length && colRes.rows[0].data_type === 'character varying') {
            await query(`DROP TABLE IF EXISTS booking_status_updates CASCADE;`);
        }
        await query(`
            CREATE TABLE IF NOT EXISTS booking_status_updates (
                id SERIAL PRIMARY KEY,
                booking_id INTEGER REFERENCES bookings(id) ON DELETE CASCADE,
                status VARCHAR(20) NOT NULL,
                therapist_id UUID,
                therapist_name VARCHAR(255),
                note TEXT,
                updated_at TIMESTAMPTZ DEFAULT NOW()
            );
        `);
    } catch (err) {
        console.error('Error creating booking_status_updates table:', err);
    }
};
ensureUpdatesTableExists();

// GET ALL BOOKINGS
const getAllBookings = async (req, res) => {
    try {
        const { status, date_from, date_to, page = 1, limit = 10 } = req.query;
        const isTherapist = req.user?.role === 'THERAPIST';

        let allBookings = [];

        if (isTherapist) {
            // For therapist view, only show bookings from our database (no mobile backend fetch)
            const localDbRes = await query("SELECT * FROM bookings");
            allBookings = localDbRes.rows;
        } else {
            // 1. Fetch previously updated bookings from the local database
            const localDbRes = await query(
                "SELECT * FROM bookings WHERE status IN ('CONFIRMED', 'COMPLETED', 'CANCELLED')"
            );
            const localUpdatedBookings = localDbRes.rows;

            // 2. Fetch pending and new bookings from the mobile backend
            let remoteBookings = [];
            try {
                const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
                if (response.ok) {
                    const data = await response.json();
                    remoteBookings = data.success ? (data.bookings || []) : [];
                }
            } catch (fetchErr) {
                console.error('Failed to fetch from mobile backend, falling back to local only:', fetchErr);
                // Fallback: load pending from local DB if any exist there
                const localPendingRes = await query("SELECT * FROM bookings WHERE status = 'PENDING'");
                remoteBookings = localPendingRes.rows;
            }

            // Filter remote bookings: keep only the ones that are not in localUpdatedBookings
            const localUpdatedIds = new Set(localUpdatedBookings.map(b => String(b.id)));
            
            // Remote bookings should have PENDING status (all new/incoming entries start as Pending)
            const pendingAndNewBookings = remoteBookings
                .filter(b => !localUpdatedIds.has(String(b.id)))
                .map(b => ({
                    ...b,
                    status: 'PENDING'
                }));

            // 3. Merge: Database updated bookings + Remote pending/new bookings
            allBookings = [...localUpdatedBookings, ...pendingAndNewBookings];
        }

        // Sort by created_at DESC, fallback to booking_date
        allBookings.sort((a, b) => new Date(b.created_at || b.booking_date) - new Date(a.created_at || a.booking_date));

        // 4. Apply Filters
        if (status) {
            allBookings = allBookings.filter(b => (b.status || '').toUpperCase() === status.toUpperCase());
        }

        if (date_from) {
            const fromDate = new Date(date_from);
            fromDate.setHours(0, 0, 0, 0);
            allBookings = allBookings.filter(b => b.booking_date && new Date(b.booking_date) >= fromDate);
        }

        if (date_to) {
            const toDate = new Date(date_to);
            toDate.setHours(23, 59, 59, 999);
            allBookings = allBookings.filter(b => b.booking_date && new Date(b.booking_date) <= toDate);
        }

        // 5. Paginate
        const total = allBookings.length;
        const pg = parseInt(page) || 1;
        const lim = parseInt(limit) || 10;
        const startIndex = (pg - 1) * lim;
        const paginatedBookings = allBookings.slice(startIndex, startIndex + lim);

        return res.json({
            success: true,
            count: paginatedBookings.length,
            bookings: paginatedBookings,
            pagination: {
                total,
                page: pg,
                limit: lim,
                totalPages: Math.ceil(total / lim)
            }
        });
    } catch (err) {
        console.error('getAllBookings error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET SINGLE BOOKING
const getBookingById = async (req, res) => {
    try {
        const result = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        return res.json({ success: true, booking: result.rows[0] });
    } catch (err) {
        console.error('getBookingById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Helper: Ensure booking exists locally by syncing from Render if needed
const ensureBookingExistsLocally = async (bookingId) => {
    const existingRes = await query('SELECT * FROM bookings WHERE id = $1', [bookingId]);
    if (existingRes.rows.length) {
        return existingRes.rows[0];
    }

    // Try fetching single booking directly by ID first
    try {
        const response = await fetch(`https://tapoclg.onrender.com/api/bookings/${bookingId}`);
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.booking) {
                const remoteBooking = data.booking;
                const paymentStatus = 'PAID';
                const insertResult = await query(
                    'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                    [
                        remoteBooking.id, remoteBooking.user_name, remoteBooking.service_name,
                        remoteBooking.booking_date, remoteBooking.booking_time, remoteBooking.therapist_name,
                        remoteBooking.note, remoteBooking.total_amount, remoteBooking.pass_details,
                        paymentStatus, 'PENDING', remoteBooking.created_at
                    ]
                );
                return insertResult.rows[0];
            }
        }
    } catch (err) {
        console.error('ensureBookingExistsLocally single fetch error:', err);
    }

    // Fallback to bulk fetch
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
        const data = await response.json();
        if (data.success && data.bookings) {
            const remoteBooking = data.bookings.find(b => String(b.id) === String(bookingId));
            if (remoteBooking) {
                const paymentStatus = 'PAID';
                const insertResult = await query(
                    'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                    [
                        remoteBooking.id, remoteBooking.user_name, remoteBooking.service_name,
                        remoteBooking.booking_date, remoteBooking.booking_time, remoteBooking.therapist_name,
                        remoteBooking.note, remoteBooking.total_amount, remoteBooking.pass_details,
                        paymentStatus, 'PENDING', remoteBooking.created_at
                    ]
                );
                return insertResult.rows[0];
            }
        }
    } catch (err) {
        console.error('ensureBookingExistsLocally bulk fallback error:', err);
    }
    return null;
};

// ─── Helper: sync all allocations for a booking across all staff ───
const syncBookingAllocations = async (bookingId, newStaffIds, newStatus, bookingData, duration) => {
    const sessionTitle = `${bookingData.service_name} - ${bookingData.user_name || 'Guest'}`;

    // Fetch current allocation rows for this booking
    const existingRows = await query(
        `SELECT id, staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
        [String(bookingId), `bk-alloc-${bookingId}-%`]
    );
    const existingStaffIds = new Set(existingRows.rows.map(r => String(r.staff_id)));
    const newStaffIdSet = new Set((newStaffIds || []).map(id => String(id)));

    // Compute added and removed
    const addedIds = [...newStaffIdSet].filter(id => !existingStaffIds.has(id));
    const removedIds = [...existingStaffIds].filter(id => !newStaffIdSet.has(id));

    // Determine target allocation status
    let allocStatus = 'active';
    if (newStatus === 'COMPLETED') allocStatus = 'expired';
    if (newStatus === 'CANCELLED') allocStatus = 'cancelled';

    // Mark removed staff rows as 'removed' (so MyAssignments can show "You have been removed from this service.")
    for (const staffId of removedIds) {
        await query(
            `UPDATE allocations SET status = 'removed' WHERE id = $1`,
            [`bk-alloc-${bookingId}-${staffId}`]
        );
    }

    // Insert or update rows for all new staff
    for (const staffId of newStaffIdSet) {
        const allocId = `bk-alloc-${bookingId}-${staffId}`;
        // Upsert: delete existing and re-insert
        await query(`DELETE FROM allocations WHERE id = $1`, [allocId]);
        await query(
            `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
                allocId,
                staffId,
                'service',
                sessionTitle,
                String(bookingId),
                bookingData.booking_date,
                bookingData.booking_date,
                bookingData.booking_time,
                duration,
                allocStatus
            ]
        );
    }

    // If status is CANCELLED or COMPLETED, also update any existing rows not in newStaffIds
    if ((newStatus === 'CANCELLED' || newStatus === 'COMPLETED') && newStaffIdSet.size === 0) {
        // Update all remaining rows for this booking to the terminal status
        await query(
            `UPDATE allocations SET status = $1 WHERE session_id = $2 AND type = 'service' AND id LIKE $3`,
            [allocStatus, String(bookingId), `bk-alloc-${bookingId}-%`]
        );
    }

    return { addedIds, removedIds };
};

// UPDATE BOOKING STATUS
const updateBookingStatus = async (req, res) => {
    // Accept staff_ids (array, preferred) or legacy staff_id (single value)
    const { status, staff_ids, staff_id, note } = req.body;
    const newStatus = status ? status.toUpperCase() : null;

    if (!newStatus || !['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED'].includes(newStatus)) {
        return res.status(400).json({ success: false, message: 'Valid status is required.' });
    }

    // Normalize to array: prefer staff_ids, fall back to staff_id
    let incomingStaffIds = null;
    if (Array.isArray(staff_ids)) {
        incomingStaffIds = staff_ids.filter(Boolean);
    } else if (staff_id !== undefined && staff_id !== null) {
        incomingStaffIds = [staff_id];
    } else if (staff_ids === null || staff_id === null) {
        incomingStaffIds = [];
    }

    try {
        const booking = await ensureBookingExistsLocally(req.params.id);
        if (!booking) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }

        // Terminal state locks
        if (booking.status === 'COMPLETED') {
            if (newStatus === 'CANCELLED') {
                return res.status(400).json({ success: false, message: 'Completed bookings cannot be cancelled.' });
            }
            return res.status(400).json({ success: false, message: 'Completed bookings cannot be modified.' });
        }
        if (booking.status === 'CANCELLED') {
            if (newStatus === 'COMPLETED') {
                return res.status(400).json({ success: false, message: 'Cancelled bookings cannot be marked as completed.' });
            }
            return res.status(400).json({ success: false, message: 'Cancelled bookings cannot be modified.' });
        }

        // Direct Pending → Completed not allowed
        if (newStatus === 'COMPLETED' && booking.status === 'PENDING') {
            return res.status(400).json({ success: false, message: 'You cannot mark a pending booking as completed.' });
        }

        // Fetch service duration
        const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
        let duration = 60;
        if (serviceRes.rows.length && serviceRes.rows[0].duration_minutes) {
            duration = serviceRes.rows[0].duration_minutes;
        }

        // Completion constraints — only from CONFIRMED, only after end time + 10 min buffer
        if (newStatus === 'COMPLETED') {
            if (booking.status !== 'CONFIRMED') {
                return res.status(400).json({ success: false, message: 'Error: Booking must be in Confirmed state to be completed.' });
            }
            const baseDate = new Date(booking.booking_date);
            const timeStr = booking.booking_time || '00:00';
            const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (match) {
                let hours = parseInt(match[1], 10);
                const mins = parseInt(match[2], 10);
                const ampm = match[3] ? match[3].toUpperCase() : null;
                if (ampm === 'PM' && hours < 12) hours += 12;
                if (ampm === 'AM' && hours === 12) hours = 0;
                baseDate.setHours(hours, mins, 0, 0);
            }
            const endTime = new Date(baseDate.getTime() + (duration + 10) * 60000);
            if (new Date() < endTime) {
                const diffMins = Math.ceil((endTime - new Date()) / 60000);
                return res.status(400).json({
                    success: false,
                    message: `Cannot complete yet. Available after end time + 10 min buffer (${diffMins} min remaining).`
                });
            }
        }

        // ─── Multi-Staff Allocation Logic (CONFIRMED only) ───────────────────────
        let finalStaffName = booking.therapist_name;
        let finalStaffId = booking.therapist_id;
        let allocDiff = { addedIds: [], removedIds: [] };

        if (newStatus === 'CONFIRMED' && incomingStaffIds !== null) {
            if (incomingStaffIds.length === 0) {
                return res.status(400).json({ success: false, message: 'Please select at least one staff member to confirm the booking.' });
            }

            // Fetch all names for display
            const staffNamesRes = await query(
                `SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])`,
                [incomingStaffIds]
            );
            const staffMap = {};
            for (const row of staffNamesRes.rows) {
                staffMap[row.id] = { name: `${row.first_name} ${row.last_name}`.trim(), email: row.email };
            }

            // Comma-joined names for display in bookings table
            finalStaffName = incomingStaffIds.map(id => staffMap[id]?.name || id).join(', ');
            // First staff ID kept for legacy therapist_id field
            finalStaffId = incomingStaffIds[0];

            // Sync allocations and get diff for notifications
            allocDiff = await syncBookingAllocations(
                booking.id, incomingStaffIds, 'CONFIRMED', booking, duration
            );

            // ── Notify removed staff ──
            for (const removedId of allocDiff.removedIds) {
                const staffInfo = staffMap[removedId];
                if (!staffInfo) {
                    // fetch from DB if not in the incoming list
                    const removedRes = await query(
                        'SELECT first_name, last_name, email FROM team_members WHERE id = $1', [removedId]
                    );
                    if (removedRes.rows.length) {
                        const r = removedRes.rows[0];
                        await sendBookingRemovalEmail({
                            to: r.email,
                            staffName: `${r.first_name} ${r.last_name}`.trim(),
                            bookingId: booking.id,
                            details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                        }).catch(e => console.error('[RemovalEmail] Error:', e));
                    }
                } else {
                    await sendBookingRemovalEmail({
                        to: staffInfo.email,
                        staffName: staffInfo.name,
                        bookingId: booking.id,
                        details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                    }).catch(e => console.error('[RemovalEmail] Error:', e));
                }
            }

            // ── Notify newly added staff ──
            for (const addedId of allocDiff.addedIds) {
                const staffInfo = staffMap[addedId];
                if (staffInfo) {
                    await sendBookingAllocationEmail({
                        to: staffInfo.email,
                        staffName: staffInfo.name,
                        bookingId: booking.id,
                        details: { service: booking.service_name, date: booking.booking_date, time: booking.booking_time, customer: booking.user_name }
                    }).catch(e => console.error('[AllocationEmail] Error:', e));
                }
            }

            // Sync each staff's availability_status
            for (const staffId of [...incomingStaffIds, ...allocDiff.removedIds]) {
                await syncStaffMemberStatus(staffId).catch(() => {});
            }

        } else if (newStatus === 'CANCELLED') {
            // Mark all existing allocation rows as cancelled
            await query(
                `UPDATE allocations SET status = 'cancelled' WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );
            finalStaffId = null;
            finalStaffName = null;

            // Sync any previously allocated staff
            if (booking.therapist_id) {
                await syncStaffMemberStatus(booking.therapist_id).catch(() => {});
            }

        } else if (newStatus === 'COMPLETED') {
            // Mark all existing allocation rows as expired
            await query(
                `UPDATE allocations SET status = 'expired' WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );
            if (booking.therapist_id) {
                await syncStaffMemberStatus(booking.therapist_id).catch(() => {});
            }
        }

        // ─── Persist to bookings table ────────────────────────────────────────────
        const result = await query(
            'UPDATE bookings SET status = $1, therapist_id = $2, therapist_name = $3, note = $4 WHERE id = $5 RETURNING *',
            [newStatus, finalStaffId, finalStaffName, note !== undefined ? note : booking.note, req.params.id]
        );
        const updatedBooking = result.rows[0];

        // Store audit record
        await query(
            `INSERT INTO booking_status_updates (booking_id, status, therapist_id, therapist_name, note, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [parseInt(updatedBooking.id), updatedBooking.status, updatedBooking.therapist_id, updatedBooking.therapist_name, updatedBooking.note]
        );

        // ─── Customer email notification ──────────────────────────────────────────
        const userEmail = updatedBooking.user_email || null;
        if (userEmail && booking.status !== newStatus) {
            await sendBookingStatusEmail({
                to: userEmail,
                firstName: updatedBooking.user_name || 'Customer',
                status: newStatus,
                details: {
                    service: updatedBooking.service_name,
                    date: updatedBooking.booking_date,
                    time: updatedBooking.booking_time,
                    staff: updatedBooking.therapist_name,
                    customer: updatedBooking.user_name
                },
                previousStatus: booking.status
            }).catch(e => console.error('[UserEmail] Error:', e));
        }

        // ─── Staff completion email (COMPLETED status) ────────────────────────────
        if (newStatus === 'COMPLETED' && booking.status !== 'COMPLETED') {
            // Send to all previously allocated staff
            const completedAllocRows = await query(
                `SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'service' AND id LIKE $2`,
                [String(booking.id), `bk-alloc-${booking.id}-%`]
            );
            for (const row of completedAllocRows.rows) {
                const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [row.staff_id]);
                if (staffRes.rows.length) {
                    const s = staffRes.rows[0];
                    await sendBookingStatusEmail({
                        to: s.email,
                        firstName: `${s.first_name} ${s.last_name}`.trim(),
                        status: 'COMPLETED',
                        details: { service: updatedBooking.service_name, date: updatedBooking.booking_date, time: updatedBooking.booking_time }
                    }).catch(e => console.error('[CompletionEmail] Error:', e));
                }
            }
        }

        return res.json({ success: true, message: 'Booking status updated.', booking: updatedBooking });
    } catch (err) {
        console.error('updateBookingStatus error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ASSIGN THERAPIST TO BOOKING
const assignTherapist = async (req, res) => {
    const { therapist_id, therapist_name } = req.body;

    try {
        const bookingRes = await query('SELECT * FROM bookings WHERE id = $1', [req.params.id]);
        if (!bookingRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Booking not found.' });
        }
        const booking = bookingRes.rows[0];
        const oldTherapistId = booking.therapist_id;

        let name = therapist_name;
        if (therapist_id) {
            const staffRes = await query('SELECT id, first_name, last_name FROM team_members WHERE id = $1', [therapist_id]);
            if (staffRes.rows.length) {
                name = (staffRes.rows[0].first_name + ' ' + staffRes.rows[0].last_name).trim();
            }
        }

        // Check scheduling conflict if booking is confirmed
        if (booking.status === 'CONFIRMED' && therapist_id) {
            const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [booking.service_name]);
            const duration = serviceRes.rows.length && serviceRes.rows[0].duration_minutes ? serviceRes.rows[0].duration_minutes : 60;

            const conflictCheck = await checkStaffAllocationConflict({
                staffId: therapist_id,
                date: booking.booking_date,
                timeStr: booking.booking_time,
                durationMins: duration,
                type: 'service',
                sessionId: booking.id
            });

            if (conflictCheck.conflict) {
                return res.status(400).json({
                    success: false,
                    message: `Staff allocation failed due to daily limit or package conflict.`
                });
            }
        }

        let wasInConflict = false;

        const result = await query(
            'UPDATE bookings SET therapist_id = $1, therapist_name = $2 WHERE id = $3 RETURNING *',
            [therapist_id || null, name || null, req.params.id]
        );
        const updatedBooking = result.rows[0];

        // Store in the separate booking_status_updates table
        await query(
            `INSERT INTO booking_status_updates (booking_id, status, therapist_id, therapist_name, note, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [parseInt(updatedBooking.id), updatedBooking.status, updatedBooking.therapist_id, updatedBooking.therapist_name, updatedBooking.note]
        );

        // Sync to allocations table
        const allocationId = `bk-alloc-${updatedBooking.id}`;
        await query('DELETE FROM allocations WHERE id = $1', [allocationId]);

        if (updatedBooking.status === 'CONFIRMED' && updatedBooking.therapist_id) {
            const serviceRes = await query('SELECT duration_minutes FROM services WHERE name = $1', [updatedBooking.service_name]);
            const duration = serviceRes.rows.length && serviceRes.rows[0].duration_minutes ? serviceRes.rows[0].duration_minutes : 60;

            await query(
                `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    allocationId,
                    updatedBooking.therapist_id,
                    'service',
                    `${updatedBooking.service_name} - ${updatedBooking.user_name || 'Guest'}`,
                    updatedBooking.id,
                    updatedBooking.booking_date,
                    updatedBooking.booking_date,
                    updatedBooking.booking_time,
                    duration,
                    'active'
                ]
            );
        }

        // Sync team_members table status for both old and new therapist
        if (oldTherapistId) {
            await syncStaffMemberStatus(oldTherapistId);
        }
        if (updatedBooking.therapist_id && updatedBooking.therapist_id !== oldTherapistId) {
            await syncStaffMemberStatus(updatedBooking.therapist_id);
        }

        if (wasInConflict && updatedBooking.therapist_id && updatedBooking.therapist_id !== oldTherapistId) {
            const userEmail = updatedBooking.user_email || req.body.user_email || null;
            if (userEmail) {
                const { sendUserReassignmentEmail } = require('../services/emailService');
                await sendUserReassignmentEmail({
                    to: userEmail,
                    userName: updatedBooking.user_name || 'Customer',
                    details: {
                        service: updatedBooking.service_name,
                        date: updatedBooking.booking_date,
                        time: updatedBooking.booking_time,
                        staff: updatedBooking.therapist_name
                    }
                }).catch(e => console.error("Error sending user reassignment email:", e));
            } else {
                console.log(`[Reassignment] Notification skipped: No user email available for booking #${updatedBooking.id}`);
            }
        }

        return res.json({ success: true, message: 'Therapist assigned.', booking: updatedBooking });
    } catch (err) {
        console.error('assignTherapist error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// SYNC BOOKINGS FROM RENDER API (mobile app data)
const syncFromRender = async (req, res) => {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/bookings?limit=100');
        const data = await response.json();

        if (!data.success || !data.bookings) {
            return res.status(400).json({ success: false, message: 'Failed to fetch from Render API.' });
        }

        let synced = 0;
        for (const booking of data.bookings) {
            const existing = await query('SELECT id FROM bookings WHERE id = $1', [booking.id]);
            if (existing.rows.length) continue;

            const paymentStatus = 'PAID';

            const insertResult = await query(
                'INSERT INTO bookings (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *',
                [
                    booking.id, booking.user_name, booking.service_name,
                    booking.booking_date, booking.booking_time, booking.therapist_name,
                    booking.note, booking.total_amount, booking.pass_details,
                    paymentStatus, 'PENDING', booking.created_at
                ]
            );

            synced++;
            
            // Try to find user email and send Pending notification
            const newBooking = insertResult.rows[0];
            let userEmail = null;
            if (newBooking.user_email) {
                userEmail = newBooking.user_email;
            }

            if (userEmail) {
                await sendBookingStatusEmail({
                    to: userEmail,
                    firstName: newBooking.user_name || 'Customer',
                    status: 'PENDING',
                    details: {
                        service: newBooking.service_name,
                        date: newBooking.booking_date,
                        time: newBooking.booking_time
                    }
                }).catch(e => console.error("Error sending pending email:", e));
            }
        }

        return res.json({ success: true, message: 'Sync complete.', synced: synced, total: data.bookings.length });
    } catch (err) {
        console.error('syncFromRender error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

module.exports = { getAllBookings, getBookingById, updateBookingStatus, assignTherapist, syncFromRender };