const { query } = require('../config/db');
const { checkStaffAllocationConflict } = require('../utils/conflictChecker');

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

    if (!title || !startDate || !endDate || !price) {
        return res.status(400).json({ success: false, message: 'Title, Start Date, End Date, and Price are required.' });
    }

    try {
        let consultantName = null;
        if (consultant_id) {
            // Verify consultant exists
            const staffRes = await query('SELECT first_name, last_name FROM team_members WHERE id = $1', [consultant_id]);
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
            }
            consultantName = `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`.trim();

            // Run conflict checks on each day of the Vedic program
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
                startDate, endDate, capacity || 20, price, accommodations || null,
                consultant_id || null, JSON.stringify(services || []), JSON.stringify(languages || []), image_url || null, registrationDeadline || null
            ]
        );

        const program = result.rows[0];

        // Create unified allocation if consultant_id provided
        if (consultant_id) {
            const allocationId = `vp-alloc-${program.id}`;
            await query(
                `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [allocationId, consultant_id, 'vedic_program', title.trim(), program.id, startDate, endDate, 1440]
            );
        }

        return res.status(201).json({ success: true, message: 'Vedic Program created.', program });
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

        const finalTitle = title !== undefined ? title : existing.title;
        const finalStartDate = startDate !== undefined ? startDate : existing.start_date;
        const finalEndDate = endDate !== undefined ? endDate : existing.end_date;
        const finalConsultantId = consultant_id !== undefined ? consultant_id : existing.consultant_id;

        // Perform conflict checks if consultant is changing or dates are changing
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
        if (capacity !== undefined) { fields.push('capacity = $' + idx++); values.push(capacity); }
        if (price !== undefined) { fields.push('price = $' + idx++); values.push(price); }
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

        // Update allocations table
        const allocationId = `vp-alloc-${programId}`;
        await query('DELETE FROM allocations WHERE id = $1', [allocationId]);

        if (finalConsultantId) {
            await query(
                `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [allocationId, finalConsultantId, 'vedic_program', finalTitle.trim(), programId, finalStartDate, finalEndDate, 1440]
            );
        }

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

        // Conflict check
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

        const allocationId = `vp-alloc-${programId}`;
        await query('DELETE FROM allocations WHERE id = $1', [allocationId]);
        await query(
            `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [allocationId, consultant_id, 'vedic_program', program.title, programId, program.start_date, program.end_date, 1440]
        );

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

    try {
        const progRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [id]);
        if (!progRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = progRes.rows[0];

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

module.exports = {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    updateVedicProgramStaff,
    enrollUserInVedicProgram,
    getVedicProgramAttendees,
    updateVedicAttendeeAttendance,
    deleteVedicProgramAttendee,
    exportVedicProgramAttendees
};
