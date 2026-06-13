const { query } = require('../config/db');
const { checkStaffAllocationConflict } = require('../utils/conflictChecker');

const getVedicProgramStatus = (startDate, endDate) => {
    if (!startDate || !endDate) return 'Upcoming';
    
    const startStr = startDate instanceof Date ? startDate.toISOString().split('T')[0] : String(startDate).split('T')[0];
    const endStr = endDate instanceof Date ? endDate.toISOString().split('T')[0] : String(endDate).split('T')[0];

    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localNow.toISOString().split('T')[0];

    if (todayStr < startStr) {
        return 'Upcoming';
    } else if (todayStr >= startStr && todayStr <= endStr) {
        return 'Live';
    } else {
        return 'Completed';
    }
};

const autoUpdateVedicProgramStatuses = async () => {
    try {
        const res = await query('SELECT id, title, start_date, end_date, consultant_id FROM vedic_programs');
        for (const p of res.rows) {
            const status = getVedicProgramStatus(p.start_date, p.end_date);
            const allocationId = `vp-alloc-${p.id}`;

            if (p.consultant_id) {
                await query(
                    `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                        staff_id = EXCLUDED.staff_id,
                        session_title = EXCLUDED.session_title,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        status = EXCLUDED.status`,
                    [allocationId, p.consultant_id, 'vedic_program', p.title.trim(), String(p.id), p.start_date, p.end_date, 1440, status]
                );
            } else {
                await query('DELETE FROM allocations WHERE id = $1', [allocationId]);
            }
        }
    } catch (err) {
        console.error('Error in autoUpdateVedicProgramStatuses:', err);
    }
};

// GET ALL VEDIC PROGRAMS
const getAllVedicPrograms = async (req, res) => {
    try {
        const result = await query(
            'SELECT vp.*, tm.first_name AS consultant_first_name, tm.last_name AS consultant_last_name ' +
            'FROM vedic_programs vp LEFT JOIN team_members tm ON tm.id = vp.consultant_id ORDER BY vp.created_at DESC'
        );

        // Map database fields to keys expected by frontend
        const programs = result.rows.map(r => ({
            id: r.id,
            title: r.title,
            type: r.type,
            description: r.description,
            duration: r.duration,
            startDate: r.start_date ? r.start_date.toISOString().split('T')[0] : null,
            endDate: r.end_date ? r.end_date.toISOString().split('T')[0] : null,
            capacity: r.capacity,
            enrolled: r.enrolled,
            price: parseFloat(r.price),
            accommodations: r.accommodations,
            consultant_id: r.consultant_id,
            consultant_name: r.consultant_id ? `${r.consultant_first_name || ''} ${r.consultant_last_name || ''}`.trim() : null,
            services: r.services,
            languages: r.languages,
            image_url: r.image_url,
            registrationDeadline: r.registration_deadline ? r.registration_deadline.toISOString().split('T')[0] : null
        }));

        return res.json({ success: true, programs });
    } catch (err) {
        console.error('getAllVedicPrograms error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CREATE VEDIC PROGRAM
const createVedicProgram = async (req, res) => {
    const { title, type, description, duration, startDate, endDate, capacity, price, accommodations, consultant_id, services, languages, image_url, registrationDeadline } = req.body;

    if (!title || !startDate || !endDate || price === undefined || price === null || price === '') {
        return res.status(400).json({ success: false, message: 'Title, Start Date, End Date, and Price are required.' });
    }

    const priceNum = Number(price);
    if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ success: false, message: 'Price must be greater than or equal to 0.' });
    }

    const capacityNum = Number(capacity !== undefined ? capacity : 20);
    if (isNaN(capacityNum) || capacityNum < 1) {
        return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
    }

    const now = new Date();
    const offset = now.getTimezoneOffset();
    const localNow = new Date(now.getTime() - (offset * 60 * 1000));
    const todayStr = localNow.toISOString().split('T')[0];

    const startStr = startDate.split('T')[0];
    const endStr = endDate.split('T')[0];

    if (startStr < todayStr) {
        return res.status(400).json({ success: false, message: 'Start date must be today or in the future.' });
    }
    if (endStr < startStr) {
        return res.status(400).json({ success: false, message: 'End date must be on or after start date.' });
    }

    if (registrationDeadline) {
        const deadStr = registrationDeadline.split('T')[0];
        if (deadStr < todayStr) {
            return res.status(400).json({ success: false, message: 'Registration deadline must be today or in the future.' });
        }
        if (deadStr > startStr) {
            return res.status(400).json({ success: false, message: 'Registration deadline must be on or before start date.' });
        }
    }

    try {
        let consultantName = null;
        if (consultant_id) {
            const staffRes = await query(
                `SELECT tm.first_name, tm.last_name, tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [consultant_id]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
            }
            const consultant = staffRes.rows[0];
            if (consultant.status !== 'active') {
                return res.status(400).json({ success: false, message: 'Selected consultant is not active.' });
            }
            const roleLower = consultant.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: 'Selected consultant must have a doctor or therapist role.' });
            }
            consultantName = `${consultant.first_name} ${consultant.last_name}`.trim();

            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: consultant_id,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program'
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Staff allocation failed due to daily limit or package conflict.`
                    });
                }
            }
        }

        const result = await query(
            `INSERT INTO vedic_programs 
             (title, type, description, duration, start_date, end_date, capacity, price, accommodations, consultant_id, services, languages, image_url, registration_deadline)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *`,
            [
                title.trim(), type || 'Retreat', description || null, duration || '7-days',
                startDate, endDate, capacityNum, priceNum, accommodations || null,
                consultant_id || null, JSON.stringify(services || []), JSON.stringify(languages || []), image_url || null, registrationDeadline || null
            ]
        );

        await autoUpdateVedicProgramStatuses();

        return res.status(201).json({ success: true, message: 'Vedic Program created.', program: result.rows[0] });
    } catch (err) {
        console.error('createVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE VEDIC PROGRAM
const updateVedicProgram = async (req, res) => {
    const { title, type, description, duration, startDate, endDate, capacity, price, accommodations, consultant_id, services, languages, image_url, registrationDeadline } = req.body;
    const programId = req.params.id;

    try {
        const existingRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!existingRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const existing = existingRes.rows[0];

        const currentStatus = getVedicProgramStatus(existing.start_date, existing.end_date);
        if (currentStatus === 'Live' || currentStatus === 'Completed') {
            return res.status(400).json({ success: false, message: 'Cannot edit a program that is currently Live or Completed.' });
        }

        if (price !== undefined) {
            const priceNum = Number(price);
            if (isNaN(priceNum) || priceNum < 0) {
                return res.status(400).json({ success: false, message: 'Price must be greater than or equal to 0.' });
            }
        }

        if (capacity !== undefined) {
            const capacityNum = Number(capacity);
            if (isNaN(capacityNum) || capacityNum < 1) {
                return res.status(400).json({ success: false, message: 'Capacity must be at least 1.' });
            }
            if (capacityNum < existing.enrolled) {
                return res.status(400).json({ success: false, message: 'New capacity cannot be less than the number of currently enrolled participants.' });
            }
        }

        const now = new Date();
        const offset = now.getTimezoneOffset();
        const localNow = new Date(now.getTime() - (offset * 60 * 1000));
        const todayStr = localNow.toISOString().split('T')[0];

        const finalStartDate = startDate !== undefined ? startDate : existing.start_date.toISOString().split('T')[0];
        const finalEndDate = endDate !== undefined ? endDate : existing.end_date.toISOString().split('T')[0];
        const finalDeadline = registrationDeadline !== undefined ? registrationDeadline : (existing.registration_deadline ? existing.registration_deadline.toISOString().split('T')[0] : null);

        const startStr = finalStartDate.split('T')[0];
        const endStr = finalEndDate.split('T')[0];

        if (startStr < todayStr) {
            return res.status(400).json({ success: false, message: 'Start date must be today or in the future.' });
        }
        if (endStr < startStr) {
            return res.status(400).json({ success: false, message: 'End date must be on or after start date.' });
        }

        if (finalDeadline) {
            const deadStr = finalDeadline.split('T')[0];
            if (deadStr < todayStr) {
                return res.status(400).json({ success: false, message: 'Registration deadline must be today or in the future.' });
            }
            if (deadStr > startStr) {
                return res.status(400).json({ success: false, message: 'Registration deadline must be on or before start date.' });
            }
        }

        const finalConsultantId = consultant_id !== undefined ? consultant_id : existing.consultant_id;

        if (consultant_id !== undefined && consultant_id !== null) {
            const staffRes = await query(
                `SELECT tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [consultant_id]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
            }
            const consultant = staffRes.rows[0];
            if (consultant.status !== 'active') {
                return res.status(400).json({ success: false, message: 'Selected consultant is not active.' });
            }
            const roleLower = consultant.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: 'Selected consultant must have a doctor or therapist role.' });
            }
        }

        if (finalConsultantId && (finalConsultantId !== existing.consultant_id || finalStartDate !== existing.start_date || finalEndDate !== existing.end_date)) {
            const start = new Date(finalStartDate);
            const end = new Date(finalEndDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: finalConsultantId,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program',
                    sessionId: programId
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Staff allocation failed due to daily limit or package conflict.`
                    });
                }
            }
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (title !== undefined) { fields.push('title = $' + idx++); values.push(title.trim()); }
        if (type !== undefined) { fields.push('type = $' + idx++); values.push(type); }
        if (description !== undefined) { fields.push('description = $' + idx++); values.push(description); }
        if (duration !== undefined) { fields.push('duration = $' + idx++); values.push(duration); }
        if (startDate !== undefined) { fields.push('start_date = $' + idx++); values.push(startDate); }
        if (endDate !== undefined) { fields.push('end_date = $' + idx++); values.push(endDate); }
        if (capacity !== undefined) { fields.push('capacity = $' + idx++); values.push(Number(capacity)); }
        if (price !== undefined) { fields.push('price = $' + idx++); values.push(Number(price)); }
        if (accommodations !== undefined) { fields.push('accommodations = $' + idx++); values.push(accommodations); }
        if (consultant_id !== undefined) { fields.push('consultant_id = $' + idx++); values.push(consultant_id || null); }
        if (services !== undefined) { fields.push('services = $' + idx++); values.push(JSON.stringify(services)); }
        if (languages !== undefined) { fields.push('languages = $' + idx++); values.push(JSON.stringify(languages)); }
        if (image_url !== undefined) { fields.push('image_url = $' + idx++); values.push(image_url); }
        if (registrationDeadline !== undefined) { fields.push('registration_deadline = $' + idx++); values.push(registrationDeadline || null); }

        values.push(programId);
        const result = await query(
            'UPDATE vedic_programs SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *',
            values
        );

        await autoUpdateVedicProgramStatuses();

        return res.json({ success: true, message: 'Vedic Program updated.', program: result.rows[0] });
    } catch (err) {
        console.error('updateVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ALLOCATE / UPDATE STAFF FOR VEDIC PROGRAM
const updateVedicProgramStaff = async (req, res) => {
    const { assigned_staff_ids } = req.body;
    const programId = req.params.id;

    if (!Array.isArray(assigned_staff_ids) || assigned_staff_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'At least one lead consultant ID is required.' });
    }

    const consultant_id = assigned_staff_ids[0];

    try {
        const programRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!programRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = programRes.rows[0];

        const currentStatus = getVedicProgramStatus(program.start_date, program.end_date);
        if (currentStatus === 'Live' || currentStatus === 'Completed') {
            return res.status(400).json({ success: false, message: 'Cannot edit or reallocate staff for a program that is currently Live or Completed.' });
        }

        const staffRes = await query(
            `SELECT tm.status, r.name AS role_name 
             FROM team_members tm
             JOIN roles r ON tm.role_id = r.id
             WHERE tm.id = $1`,
            [consultant_id]
        );
        if (!staffRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
        }
        const consultant = staffRes.rows[0];
        if (consultant.status !== 'active') {
            return res.status(400).json({ success: false, message: 'Selected consultant is not active.' });
        }
        const roleLower = consultant.role_name.toLowerCase();
        if (roleLower !== 'doctor' && roleLower !== 'therapist') {
            return res.status(400).json({ success: false, message: 'Selected consultant must have a doctor or therapist role.' });
        }

        const start = new Date(program.start_date);
        const end = new Date(program.end_date);
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const dateStr = d.toISOString().split('T')[0];
            const conflictCheck = await checkStaffAllocationConflict({
                staffId: consultant_id,
                date: dateStr,
                timeStr: '00:00',
                durationMins: 1440,
                type: 'vedic_program',
                sessionId: programId
            });

            if (conflictCheck.conflict) {
                return res.status(400).json({
                    success: false,
                    message: `Staff allocation failed due to daily limit or package conflict.`
                });
            }
        }

        await query('UPDATE vedic_programs SET consultant_id = $1 WHERE id = $2', [consultant_id, programId]);

        await autoUpdateVedicProgramStatuses();

        return res.json({ success: true, message: 'Consultant allocated successfully.' });
    } catch (err) {
        console.error('updateVedicProgramStaff error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ENROLL USER IN VEDIC PROGRAM (Admin manual enrollment)
const enrollUserInVedicProgram = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
        return res.status(400).json({ success: false, message: 'Invalid email format.' });
    }

    try {
        const progRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [id]);
        if (!progRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = progRes.rows[0];

        // Status check - only allow upcoming programs
        const status = getVedicProgramStatus(program.start_date, program.end_date);
        if (status === 'Live' || status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Enrollment is closed as this program is already ongoing or completed.' });
        }

        // Capacity check
        if (program.enrolled >= program.capacity) {
            return res.status(400).json({ success: false, message: 'Program is at full capacity.' });
        }

        // Check registration deadline if set
        if (program.registration_deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(program.registration_deadline);
            if (today > deadline) {
                return res.status(400).json({ success: false, message: 'Registration has closed for this program.' });
            }
        }

        // Check if already enrolled
        const attendeeCheck = await query('SELECT 1 FROM vedic_program_attendees WHERE program_id = $1 AND email = $2', [id, email.toLowerCase().trim()]);
        if (attendeeCheck.rows.length) {
            return res.status(400).json({ success: false, message: 'User is already enrolled in this program.' });
        }

        const result = await query(
            'INSERT INTO vedic_program_attendees (program_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null]
        );

        // Update enrolled count
        await query('UPDATE vedic_programs SET enrolled = enrolled + 1 WHERE id = $1', [id]);

        return res.status(201).json({
            success: true,
            message: 'Successfully enrolled in program.',
            attendee: result.rows[0]
        });
    } catch (err) {
        console.error('enrollUserInVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET VEDIC PROGRAM ATTENDEES (Admin Endpoint)
const getVedicProgramAttendees = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('SELECT * FROM vedic_program_attendees WHERE program_id = $1 ORDER BY created_at DESC', [id]);
        return res.json({ success: true, attendees: result.rows });
    } catch (err) {
        console.error('getVedicProgramAttendees error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE VEDIC ATTENDEE ATTENDANCE STATUS (Admin Endpoint)
const updateVedicAttendeeAttendance = async (req, res) => {
    const { id, attendeeId } = req.params;
    const { status } = req.body;

    if (!['enrolled', 'attended', 'absent'].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be 'enrolled', 'attended', or 'absent'." });
    }

    try {
        const result = await query(
            'UPDATE vedic_program_attendees SET status = $1, updated_at = NOW() WHERE program_id = $2 AND id = $3 RETURNING *',
            [status, id, attendeeId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }

        return res.json({ success: true, message: 'Attendance status updated.', attendee: result.rows[0] });
    } catch (err) {
        console.error('updateVedicAttendeeAttendance error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE VEDIC PROGRAM ATTENDEE (Admin Endpoint)
const deleteVedicProgramAttendee = async (req, res) => {
    const { id, attendeeId } = req.params;
    try {
        const check = await query('SELECT 1 FROM vedic_program_attendees WHERE id = $1 AND program_id = $2', [attendeeId, id]);
        if (!check.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }

        await query('DELETE FROM vedic_program_attendees WHERE id = $1 AND program_id = $2', [attendeeId, id]);
        await query('UPDATE vedic_programs SET enrolled = GREATEST(0, enrolled - 1) WHERE id = $1', [id]);

        const updatedRes = await query('SELECT * FROM vedic_program_attendees WHERE program_id = $1 ORDER BY created_at DESC', [id]);
        return res.json({ success: true, message: 'Attendee deleted.', attendees: updatedRes.rows });
    } catch (err) {
        console.error('deleteVedicProgramAttendee error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// EXPORT VEDIC PROGRAM ATTENDEES (Admin Endpoint)
const exportVedicProgramAttendees = async (req, res) => {
    const { id } = req.params;
    try {
        const progRes = await query('SELECT title FROM vedic_programs WHERE id = $1', [id]);
        if (!progRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const title = progRes.rows[0].title;

        const result = await query('SELECT name, email, phone, status, created_at FROM vedic_program_attendees WHERE program_id = $1 ORDER BY name ASC', [id]);
        
        let csvContent = 'Name,Email,Phone,Status,Enrolled At\n';
        for (const row of result.rows) {
            const enrolledAt = row.created_at ? new Date(row.created_at).toISOString() : '';
            csvContent += `"${row.name.replace(/"/g, '""')}","${row.email.replace(/"/g, '""')}","${(row.phone || '').replace(/"/g, '""')}","${row.status}","${enrolledAt}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendees-${title.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
        return res.send(csvContent);
    } catch (err) {
        console.error('exportVedicProgramAttendees error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE VEDIC PROGRAM (Admin Endpoint)
const deleteVedicProgram = async (req, res) => {
    const programId = req.params.id;
    try {
        const existingRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!existingRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const existing = existingRes.rows[0];

        if (existing.enrolled > 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete a program with active enrollments.' });
        }

        const status = getVedicProgramStatus(existing.start_date, existing.end_date);
        if (status === 'Live' || status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Cannot delete a program that is currently Live or Completed.' });
        }

        await query('DELETE FROM allocations WHERE id = $1', [`vp-alloc-${programId}`]);
        await query('DELETE FROM vedic_programs WHERE id = $1', [programId]);

        return res.json({ success: true, message: 'Vedic Program deleted successfully.' });
    } catch (err) {
        console.error('deleteVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    updateVedicProgramStaff,
    enrollUserInVedicProgram,
    getVedicProgramAttendees,
    updateVedicAttendeeAttendance,
    deleteVedicProgramAttendee,
    exportVedicProgramAttendees,
    deleteVedicProgram,
    autoUpdateVedicProgramStatuses
};
