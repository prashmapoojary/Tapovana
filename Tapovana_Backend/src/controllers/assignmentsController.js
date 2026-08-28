const { query } = require('../config/db');

const { getMyAssignments: getMyAssignmentsService } = require('./servicesController');

const getMyAssignments = async (req, res) => {
    return getMyAssignmentsService(req, res);
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