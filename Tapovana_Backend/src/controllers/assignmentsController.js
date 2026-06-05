const { query } = require('../config/db');

const getMyAssignments = async (req, res) => {
    try {
        const userId = req.user.id;

        const userResult = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email,
              tm.availability_status, tm.allocation_details,
              r.name AS role
       FROM team_members tm
       JOIN roles r ON r.id = tm.role_id
       WHERE tm.id = $1`,
            [userId]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userResult.rows[0];
        const allocDetails = user.allocation_details;

        // Also find allocations from services table
        const servicesResult = await query(
            `SELECT id, name, category, created_at
       FROM services
       WHERE assigned_staff_ids @> $1::jsonb`,
            [JSON.stringify([userId])]
        );

        const assignments = [];

        // From allocation_details in team_members
        if (allocDetails && allocDetails.type === 'service') {
            assignments.push({
                id: allocDetails.id || allocDetails.sessionId,
                type: 'service',
                staffId: userId,
                staffName: `${user.first_name} ${user.last_name}`.trim(),
                staffRole: user.role,
                sessionTitle: allocDetails.sessionTitle || 'Service',
                sessionId: allocDetails.sessionId,
                startDate: allocDetails.startDate,
                endDate: allocDetails.endDate,
                status: user.availability_status === 'Allocated' ? 'active' : 'expired',
                createdAt: allocDetails.startDate
            });
        }

        // From services table assigned_staff_ids
        for (const svc of servicesResult.rows) {
            // Avoid duplicates
            const exists = assignments.find(a => a.sessionId === svc.id);
            if (!exists) {
                assignments.push({
                    id: `srv-${svc.id}`,
                    type: 'service',
                    staffId: userId,
                    staffName: `${user.first_name} ${user.last_name}`.trim(),
                    staffRole: user.role,
                    sessionTitle: svc.name,
                    sessionId: svc.id,
                    startDate: svc.created_at,
                    endDate: null,
                    status: user.availability_status === 'Allocated' ? 'active' : 'expired',
                    createdAt: svc.created_at
                });
            }
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