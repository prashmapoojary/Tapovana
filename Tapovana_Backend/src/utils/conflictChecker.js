const { query } = require('../config/db');

/**
 * Parses time string like "10:00 AM", "2:00 PM", "14:00" into minutes from midnight.
 */
const getMinsFromTime = (timeStr) => {
    if (!timeStr) return 0;
    let match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) return 0;
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + mins;
};

/**
 * Checks if allocating a staff member creates a scheduling conflict or exceeds daily limits.
 * Returns { conflict: boolean, message: string }
 */
const checkStaffAllocationConflict = async ({
    staffId,
    date,          // String (YYYY-MM-DD)
    timeStr,       // String (e.g. "10:00 AM" or "14:00")
    durationMins,  // Integer duration
    type,          // 'service' | 'workshop' | 'vedic_program'
    sessionId      // ID of the proposed session (to exclude from conflict checks)
}) => {
    if (!staffId) return { conflict: false };

    const proposedDate = new Date(date).toISOString().split('T')[0];
    const proposedStartMins = getMinsFromTime(timeStr);
    const proposedEndMins = proposedStartMins + (durationMins || 60);



    // 1. Fetch all existing allocations for the staff member on that date
    // We select active allocations that overlap with the proposed date.
    // For Vedic Programs (which span multiple days), we check if the proposedDate falls within [start_date, end_date]
    const allocationsRes = await query(
        `SELECT id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes 
         FROM allocations 
         WHERE staff_id = $1 
           AND status = 'active'
           AND (
             ((type = 'vedic_program' OR type = 'vedic_package') AND start_date::date <= $2::date AND end_date::date >= $2::date)
             OR (type != 'vedic_program' AND type != 'vedic_package' AND start_date::date = $2::date)
           )
           AND session_id != $3`,
        [staffId, proposedDate, String(sessionId || '')]
    );

    const existingAllocations = allocationsRes.rows;

    const serviceCount = existingAllocations.filter(a => a.type === 'service').length;
    const workshopCount = existingAllocations.filter(a => a.type === 'workshop').length;
    const vedicCount = existingAllocations.filter(a => a.type === 'vedic_program' || a.type === 'vedic_package').length;

    // ── Rule: Vedic Life Package exclusivity ──
    if (type === 'vedic_program' || type === 'vedic_package') {
        if (serviceCount > 0 || workshopCount > 0) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
    }

    if (type === 'service') {
        if (vedicCount > 0) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
        // Max 2 services
        if (serviceCount >= 2) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
        // If 2 services + 1 workshop are assigned, they must include a Vedic Life Package
        if (serviceCount + 1 === 2 && workshopCount === 1 && vedicCount === 0) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
    }

    if (type === 'workshop') {
        if (vedicCount > 0) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
        // Max 1 workshop
        if (workshopCount >= 1) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
        // If 2 services + 1 workshop are assigned, they must include a Vedic Life Package
        if (serviceCount === 2 && workshopCount + 1 === 1 && vedicCount === 0) {
            return {
                conflict: true,
                message: 'Staff allocation failed due to daily limit or package conflict.'
            };
        }
    }

    // ── Rule: Time-Slot Overlap checking ──
    for (const a of existingAllocations) {
        // Vedic program was already checked above and would have blocked the day.
        // For services and workshops, we check exact time overlap.
        const existingStartMins = getMinsFromTime(a.booking_time);
        const existingEndMins = existingStartMins + (a.duration_minutes || 60);

        const overlap = (proposedStartMins < existingEndMins && proposedEndMins > existingStartMins);
        if (overlap) {
            return {
                conflict: true,
                message: `Staff allocation failed due to daily limit or package conflict.`
            };
        }
    }

    return { conflict: false };
};

/**
 * Synchronizes the availability_status and allocation_details in team_members
 * table for a given staff member based on their active allocations in allocations table.
 */
const syncStaffMemberStatus = async (staffId) => {
    if (!staffId) return;

    try {
        const activeAllocRes = await query(
            `SELECT * FROM allocations 
             WHERE staff_id = $1 AND status = 'active'
             ORDER BY start_date DESC, created_at DESC 
             LIMIT 1`,
            [staffId]
        );

        if (activeAllocRes.rows.length) {
            const alloc = activeAllocRes.rows[0];
            const details = {
                id: alloc.id,
                type: alloc.type,
                sessionTitle: alloc.session_title,
                sessionId: alloc.session_id,
                startDate: alloc.start_date,
                endDate: alloc.end_date
            };

            await query(
                `UPDATE team_members 
                 SET availability_status = 'Allocated', allocation_details = $1::jsonb 
                 WHERE id = $2`,
                [JSON.stringify(details), staffId]
            );
        } else {
            await query(
                `UPDATE team_members 
                 SET availability_status = 'Available', allocation_details = NULL 
                 WHERE id = $2`,
                [staffId]
            );
        }
    } catch (err) {
        console.error(`Error in syncStaffMemberStatus for staff ${staffId}:`, err);
    }
};

/**
 * Suggests active doctors/therapists who are available for allocation on a specific date/time.
 */
const getReplacementSuggestions = async (type, date, timeStr, durationMins, sessionId) => {
    try {
        const proposedDate = new Date(date).toISOString().split('T')[0];
        
        // Find all active doctors and therapists
        const staffRes = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, r.name AS role
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             WHERE tm.status = 'active'
               AND r.name IN ('doctor', 'therapist')`
        );

        const suggestions = [];
        for (const staff of staffRes.rows) {
            const check = await checkStaffAllocationConflict({
                staffId: staff.id,
                date: proposedDate,
                timeStr,
                durationMins,
                type,
                sessionId
            });

            if (!check.conflict) {
                suggestions.push({
                    id: staff.id,
                    name: `${staff.first_name || ''} ${staff.last_name || ''}`.trim(),
                    role: staff.role.toUpperCase()
                });
            }
        }
        return suggestions;
    } catch (err) {
        console.error('getReplacementSuggestions error:', err);
        return [];
    }
};

module.exports = {
    checkStaffAllocationConflict,
    getMinsFromTime,
    syncStaffMemberStatus,
    getReplacementSuggestions
};
