const { query } = require('../config/db');

const getMyAssignments = async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email,
              tm.availability_status, r.name AS role
       FROM team_members tm
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.id = $1`,
            [userId]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userResult.rows[0];

        // Now get all allocations from allocations table for this staff member, filtering out deleted bookings
        const allocResult = await query(
            `SELECT a.id, a.staff_id, a.type, a.session_title, a.session_id, 
                    a.start_date, a.end_date, a.booking_time, a.status, a.created_at,
                    b.status AS booking_status
             FROM allocations a
             LEFT JOIN deleted_booking_ids d ON d.booking_id = CASE WHEN a.session_id ~ '^[0-9]+$' THEN CAST(a.session_id AS INTEGER) ELSE NULL END
             LEFT JOIN bookings b ON a.type = 'service' AND a.session_id ~ '^[0-9]+$' AND CAST(a.session_id AS INTEGER) = b.id
             WHERE a.staff_id = $1 AND d.booking_id IS NULL`,
            [userId]
        );

        const assignments = [];
        for (const row of allocResult.rows) {
            let status = row.status;
            if (row.type === 'service' && row.booking_status === 'PENDING') {
                status = 'pending';
            }
            assignments.push({
                id: row.id,
                type: row.type,
                staffId: userId,
                staffName: `${user.first_name} ${user.last_name}`.trim(),
                staffRole: user.role,
                sessionTitle: row.session_title,
                sessionId: row.session_id,
                startDate: row.start_date,
                endDate: row.end_date,
                bookingTime: row.booking_time,
                status: status,
                createdAt: row.created_at
            });
        }

        return res.json({ success: true, assignments, user });
    } catch (err) {
        console.error('getMyAssignments error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const completeMyAssignment = async (req, res) => {
    const { staff_id, session_id, type } = req.body;

    if (!staff_id) {
        return res.status(400).json({ success: false, message: 'staff_id is required.' });
    }

    try {
        // If it's a service, call the service completion
        if (type === 'service' && session_id) {
            // Remove from service's assigned_staff_ids
            const serviceRes = await query('SELECT assigned_staff_ids FROM services WHERE id = $1', [session_id]);
            if (serviceRes.rows.length) {
                let staffIds = serviceRes.rows[0].assigned_staff_ids || [];
                staffIds = staffIds.filter(id => id !== staff_id);
                await query('UPDATE services SET assigned_staff_ids = $1 WHERE id = $2', [JSON.stringify(staffIds), session_id]);
            }
        }

        // Set staff back to Available
        await query(
            `UPDATE team_members
       SET availability_status = 'Available', allocation_details = NULL
       WHERE id = $1`,
            [staff_id]
        );

        return res.json({ success: true, message: 'Assignment completed. Status set to Available.' });
    } catch (err) {
        console.error('completeMyAssignment error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = { getMyAssignments, completeMyAssignment };