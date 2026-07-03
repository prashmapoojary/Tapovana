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
    const allocationsRes = await query(
        `SELECT id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes 
         FROM allocations 
         WHERE staff_id = $1 
           AND status NOT IN ('Completed', 'completed', 'expired', 'cancelled', 'removed', 'Cancelled')
           AND (
             (type = 'vedic_program' AND start_date::date <= $2::date AND end_date::date >= $2::date)
             OR (type != 'vedic_program' AND start_date::date = $2::date)
           )
           AND session_id != $3`,
        [staffId, proposedDate, String(sessionId || '')]
    );

    const existingAllocations = allocationsRes.rows;

    const vedicAlloc = existingAllocations.find(a => a.type === 'vedic_program');
    const serviceAllocations = existingAllocations.filter(a => a.type === 'service');
    const workshopAllocations = existingAllocations.filter(a => a.type === 'workshop');

    const serviceCount = serviceAllocations.length;
    const workshopCount = workshopAllocations.length;

    // ── Rule 4: Vedic Life active check (Enforcement Priority 1) ──
    if (vedicAlloc) {
        const startStr = new Date(vedicAlloc.start_date).toISOString().split('T')[0];
        const endStr = new Date(vedicAlloc.end_date).toISOString().split('T')[0];
        return {
            conflict: true,
            reasonCode: 'VEDIC_LIFE_ACTIVE',
            message: `This staff member is currently assigned to an active Vedic Life package from ${startStr} to ${endStr}. They cannot be allocated to any service or workshop until this package ends.`
        };
    }

    if (type === 'vedic_program') {
        if (serviceCount > 0 || workshopCount > 0) {
            return {
                conflict: true,
                reasonCode: 'TIME_CONFLICT',
                message: 'Cannot allocate a Vedic Life Program when the staff already has services or workshops assigned on overlapping dates.'
            };
        }
    }

    // ── Rule 2: Time conflict check (Enforcement Priority 2) ──
    for (const a of existingAllocations) {
        const existingStartMins = getMinsFromTime(a.booking_time);
        const existingEndMins = existingStartMins + (a.duration_minutes || 60);
        const overlap = (proposedStartMins < existingEndMins && proposedEndMins > existingStartMins);
        if (overlap) {
            let existingType = 'service';
            if (a.type === 'workshop') existingType = 'workshop';
            if (a.type === 'vedic_program') existingType = 'Vedic Life package';
            return {
                conflict: true,
                reasonCode: 'TIME_CONFLICT',
                message: `This staff member is already booked for another ${existingType} during this time slot on ${date}. Please choose a different time or staff member.`
            };
        }
    }

    // ── Rule 1: Daily Service Cap check (Enforcement Priority 3) ──
    if (serviceCount >= 3) {
        return {
            conflict: true,
            reasonCode: 'DAILY_SERVICE_CAP_REACHED',
            message: 'This staff member has already reached the maximum of 3 services for the selected day. No further service, workshop, or Vedic Life package can be assigned to them on this date.'
        };
    }

    // ── Rule 3: Service + Workshop Combination Limit ──
    if (type === 'service') {
        if (serviceCount >= 2 && workshopCount >= 1) {
            return {
                conflict: true,
                reasonCode: 'SERVICE_BLOCKED_BY_WORKSHOP',
                message: 'This staff member already has 2 services and 1 workshop for this day, so a 3rd service cannot be added. Maximum daily capacity reached.'
            };
        }
    } else if (type === 'workshop') {
        if (workshopCount >= 1) {
            if (serviceCount >= 2) {
                return {
                    conflict: true,
                    reasonCode: 'WORKSHOP_LIMIT_REACHED',
                    message: 'This staff member already has 2 services and 1 workshop allocated for this day. No additional workshop can be added.'
                };
            } else {
                return {
                    conflict: true,
                    reasonCode: 'WORKSHOP_LIMIT_REACHED',
                    message: 'This staff member is already allocated to a workshop on this day. No additional workshop can be added.'
                };
            }
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
             WHERE staff_id = $1 AND status NOT IN ('Completed', 'completed', 'expired', 'cancelled', 'removed', 'Cancelled')
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
                 WHERE id = $1`,
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
               AND LOWER(r.name) IN ('doctor', 'therapist')`
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
