const { query } = require('../config/db');
const { checkStaffAllocationConflict } = require('../utils/conflictChecker');

const validateVedicAttendee = (data, isNew = true) => {
    const { name, email, phone, status, accommodation_type, payment_status, checkin_date, checkout_date } = data;

    if (isNew) {
        if (!name || typeof name !== 'string' || !/^[A-Za-z\s]+$/.test(name) || name.trim().length < 2) {
            return 'Name is required, must contain alphabets only, and be at least 2 characters.';
        }
        if (!email || typeof email !== 'string' || !email.trim().toLowerCase().endsWith('.com') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
            return 'Valid email format ending with .com is required.';
        }
        if (!phone || typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) {
            return 'Phone number must be exactly 10 digits and numeric only.';
        }
    } else {
        if (name !== undefined) {
            if (typeof name !== 'string' || !/^[A-Za-z\s]+$/.test(name) || name.trim().length < 2) {
                return 'Name must contain alphabets only and be at least 2 characters.';
            }
        }
        if (email !== undefined) {
            if (typeof email !== 'string' || !email.trim().toLowerCase().endsWith('.com') || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
                return 'Valid email format ending with .com is required.';
            }
        }
        if (phone !== undefined) {
            if (typeof phone !== 'string' || !/^\d{10}$/.test(phone.trim())) {
                return 'Phone number must be exactly 10 digits and numeric only.';
            }
        }
    }

    if (status) {
        const validStatuses = ['REGISTERED','CONFIRMED','CHECKED_IN','ATTENDED','ABSENT','CANCELLED'];
        if (!validStatuses.includes(status.toUpperCase())) {
            return `Status must be one of: ${validStatuses.join(', ')}.`;
        }
    }

    if (accommodation_type) {
        if (typeof accommodation_type !== 'string' || !/^[A-Za-z\s0-9-]+$/.test(accommodation_type)) {
            return 'Accommodation type must be text only.';
        }
    }

    if (payment_status) {
        const validPayment = ['PAID','PENDING','PARTIALLY_PAID'];
        if (!validPayment.includes(payment_status.toUpperCase())) {
            return `Payment Status must be one of: ${validPayment.join(', ')}.`;
        }
    }

    if (checkin_date) {
        const cid = new Date(checkin_date);
        if (isNaN(cid.getTime())) {
            return 'Check-in date is invalid.';
        }
        if (isNew) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (cid < today) {
                return 'Check-in date cannot be in the past.';
            }
        }
    }

    if (checkout_date) {
        const cod = new Date(checkout_date);
        if (isNaN(cod.getTime())) {
            return 'Check-out date is invalid.';
        }
        if (isNew) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (cod < today) {
                return 'Check-out date cannot be in the past.';
            }
        }
    }

    if (checkin_date && checkout_date) {
        const cid = new Date(checkin_date);
        const cod = new Date(checkout_date);
        if (cod < cid) {
            return 'Check-out date must be on or after check-in date.';
        }
    }

    return null;
};

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
        const res = await query('SELECT id, title, start_date, end_date, lead_consultant_id, status FROM vedic_programs');
        const staffToSync = new Set();

        for (const p of res.rows) {
            if (p.status === 'Cancelled') {
                const currentAllocations = await query('SELECT staff_id FROM allocations WHERE id LIKE $1', [`vp-alloc-${p.id}%`]);
                for (const row of currentAllocations.rows) {
                    staffToSync.add(row.staff_id);
                }
                await query('DELETE FROM allocations WHERE id LIKE $1', [`vp-alloc-${p.id}%`]);
                continue;
            }
            const calculatedStatus = getVedicProgramStatus(p.start_date, p.end_date);
            if (p.status !== calculatedStatus) {
                await query('UPDATE vedic_programs SET status = $1 WHERE id = $2', [calculatedStatus, p.id]);
            }
            
            const prefix = `vp-alloc-${p.id}-`;
            const existingAllocations = await query('SELECT staff_id FROM allocations WHERE id LIKE $1', [prefix + '%']);
            for (const row of existingAllocations.rows) {
                staffToSync.add(row.staff_id);
            }

            await query('DELETE FROM allocations WHERE id LIKE $1', [prefix + '%']);

            if (p.lead_consultant_id) {
                staffToSync.add(p.lead_consultant_id);
                const allocId = `${prefix}lead-${p.lead_consultant_id}`;
                await query(
                    `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                        staff_id = EXCLUDED.staff_id,
                        session_title = EXCLUDED.session_title,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        status = EXCLUDED.status`,
                    [allocId, p.lead_consultant_id, 'vedic_program', p.title.trim(), String(p.id), p.start_date, p.end_date, 1440, calculatedStatus]
                );
            }

            const staffRes = await query('SELECT staff_id FROM vedic_program_staff WHERE program_id = $1', [p.id]);
            for (const row of staffRes.rows) {
                staffToSync.add(row.staff_id);
                const allocId = `${prefix}staff-${row.staff_id}`;
                await query(
                    `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                     ON CONFLICT (id) DO UPDATE SET
                        staff_id = EXCLUDED.staff_id,
                        session_title = EXCLUDED.session_title,
                        start_date = EXCLUDED.start_date,
                        end_date = EXCLUDED.end_date,
                        status = EXCLUDED.status`,
                    [allocId, row.staff_id, 'vedic_program', p.title.trim(), String(p.id), p.start_date, p.end_date, 1440, calculatedStatus]
                );
            }
        }

        const { syncStaffMemberStatus } = require('../utils/conflictChecker');
        for (const staffId of staffToSync) {
            await syncStaffMemberStatus(staffId);
        }
    } catch (err) {
        console.error('Error in autoUpdateVedicProgramStatuses:', err);
    }
};

// GET ALL VEDIC PROGRAMS
const getAllVedicPrograms = async (req, res) => {
    try {
        const [result, staffRes] = await Promise.all([
            query(
                `SELECT vp.*, tm.first_name AS consultant_first_name, tm.last_name AS consultant_last_name 
                 FROM vedic_programs vp 
                 LEFT JOIN team_members tm ON tm.id = vp.lead_consultant_id 
                 ORDER BY vp.created_at DESC`
            ),
            query(`SELECT program_id, staff_id FROM vedic_program_staff`)
        ]);

        const staffMap = {};
        for (const row of staffRes.rows) {
            if (!staffMap[row.program_id]) {
                staffMap[row.program_id] = [];
            }
            staffMap[row.program_id].push(row.staff_id);
        }

        const updatePromises = [];
        const programs = result.rows.map((r) => {
            const assigned_staff_ids = staffMap[r.id] || [];
            const consultant_name = r.lead_consultant_id ? `${r.consultant_first_name || ''} ${r.consultant_last_name || ''}`.trim() : null;

            let status = r.status || 'Upcoming';
            if (status !== 'Cancelled') {
                status = getVedicProgramStatus(r.start_date, r.end_date);
                if (r.status !== status) {
                    updatePromises.push(
                        query('UPDATE vedic_programs SET status = $1 WHERE id = $2', [status, r.id])
                    );
                }
            }

            return {
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
                lead_consultant_id: r.lead_consultant_id,
                consultant_id: r.lead_consultant_id, // back-compat for frontend
                consultant_name: consultant_name,
                services: r.services,
                languages: r.languages,
                image_url: r.image_url,
                registrationDeadline: r.registration_deadline ? r.registration_deadline.toISOString().split('T')[0] : null,
                status: status,
                assigned_staff_ids
            };
        });

        if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
        }

        return res.json({ success: true, programs });
    } catch (err) {
        console.error('getAllVedicPrograms error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CREATE VEDIC PROGRAM
const createVedicProgram = async (req, res) => {
    const programId = req.body.program_id || req.body.package_id || req.body.vedic_program_id;
    if (programId && req.body.email && req.body.name) {
        req.params.id = programId;
        return enrollUserInVedicProgram(req, res);
    }

    const { title, type, description, duration, startDate, endDate, capacity, price, accommodations, consultant_id, lead_consultant_id, assigned_staff_ids, services, languages, image_url, registrationDeadline } = req.body;

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

    const finalLeadId = lead_consultant_id || consultant_id || null;

    try {
        if (finalLeadId) {
            const staffRes = await query(
                `SELECT tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [finalLeadId]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
            }
            const consultant = staffRes.rows[0];
            if (consultant.status !== 'active') {
                return res.status(400).json({ success: false, message: 'Selected lead consultant is not active.' });
            }
            const roleLower = consultant.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: 'Selected lead consultant must have a doctor or therapist role.' });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: finalLeadId,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program'
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Lead consultant allocation conflict on ${dateStr}.`
                    });
                }
            }
        }

        const staffIds = Array.isArray(assigned_staff_ids) ? assigned_staff_ids.filter(id => id !== null && id !== undefined) : [];
        if (staffIds.length > 9) {
            return res.status(400).json({ success: false, message: 'Maximum 9 specialists can be assigned.' });
        }

        for (const staffId of staffIds) {
            if (staffId === finalLeadId) {
                return res.status(400).json({ success: false, message: 'Lead consultant cannot also be assigned as a specialist.' });
            }

            const staffRes = await query(
                `SELECT tm.first_name, tm.last_name, tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [staffId]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: `Selected specialist ID ${staffId} not found.` });
            }
            const s = staffRes.rows[0];
            if (s.status !== 'active') {
                return res.status(400).json({ success: false, message: `Specialist ${s.first_name} ${s.last_name} is not active.` });
            }
            const roleLower = s.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: `Specialist ${s.first_name} ${s.last_name} must have a doctor or therapist role.` });
            }

            const start = new Date(startDate);
            const end = new Date(endDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program'
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Specialist ${s.first_name} ${s.last_name} has conflict on ${dateStr}.`
                    });
                }
            }
        }

        const result = await query(
            `INSERT INTO vedic_programs 
             (title, type, description, duration, start_date, end_date, capacity, price, accommodations, lead_consultant_id, services, languages, image_url, registration_deadline, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *`,
            [
                title.trim(), type || 'Retreat', description || null, duration || '7-days',
                startDate, endDate, capacityNum, priceNum, accommodations || null,
                finalLeadId, JSON.stringify(services || []), JSON.stringify(languages || []), image_url || null, registrationDeadline || null, 'Upcoming'
            ]
        );

        const newProgram = result.rows[0];

        for (const staffId of staffIds) {
            await query(
                'INSERT INTO vedic_program_staff (program_id, staff_id, role) VALUES ($1, $2, $3)',
                [newProgram.id, staffId, 'assigned_staff']
            );
        }

        const { sendVedicStaffAssignmentEmail } = require('../services/emailService');
        if (finalLeadId) {
            const leadRes = await query("SELECT first_name, last_name, email FROM team_members WHERE id = $1", [finalLeadId]);
            if (leadRes.rows.length && leadRes.rows[0].email) {
                try {
                    await sendVedicStaffAssignmentEmail({
                        to: leadRes.rows[0].email,
                        staffName: `${leadRes.rows[0].first_name} ${leadRes.rows[0].last_name}`,
                        programTitle: newProgram.title,
                        role: 'Lead Consultant',
                        startDate: newProgram.start_date,
                        endDate: newProgram.end_date,
                        time: newProgram.time
                    });
                } catch (err) {
                    console.error('Failed to send assignment email to lead consultant:', err);
                }
            }
        }

        for (const staffId of staffIds) {
            const staffRes = await query("SELECT first_name, last_name, email FROM team_members WHERE id = $1", [staffId]);
            if (staffRes.rows.length && staffRes.rows[0].email) {
                try {
                    await sendVedicStaffAssignmentEmail({
                        to: staffRes.rows[0].email,
                        staffName: `${staffRes.rows[0].first_name} ${staffRes.rows[0].last_name}`,
                        programTitle: newProgram.title,
                        role: 'Specialist',
                        startDate: newProgram.start_date,
                        endDate: newProgram.end_date,
                        time: newProgram.time
                    });
                } catch (err) {
                    console.error('Failed to send assignment email to specialist:', err);
                }
            }
        }

        await autoUpdateVedicProgramStatuses();

        return res.status(201).json({ success: true, message: 'Vedic Program created.', program: newProgram });
    } catch (err) {
        console.error('createVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE VEDIC PROGRAM
const updateVedicProgram = async (req, res) => {
    const { title, type, description, duration, startDate, endDate, capacity, price, accommodations, consultant_id, lead_consultant_id, assigned_staff_ids, services, languages, image_url, registrationDeadline } = req.body;
    const programId = req.params.id;

    try {
        const existingRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!existingRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const existing = existingRes.rows[0];

        const currentStatus = existing.status || getVedicProgramStatus(existing.start_date, existing.end_date);
        if (currentStatus === 'Live' || currentStatus === 'Completed' || currentStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot edit a program that is currently Live, Completed, or Cancelled.' });
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

        const resolvedLeadId = lead_consultant_id !== undefined ? lead_consultant_id : (consultant_id !== undefined ? consultant_id : existing.lead_consultant_id);

        if (resolvedLeadId) {
            const staffRes = await query(
                `SELECT tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [resolvedLeadId]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: 'Selected lead consultant not found.' });
            }
            const consultant = staffRes.rows[0];
            if (consultant.status !== 'active') {
                return res.status(400).json({ success: false, message: 'Selected lead consultant is not active.' });
            }
            const roleLower = consultant.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: 'Selected lead consultant must have a doctor or therapist role.' });
            }
        }

        if (resolvedLeadId && (resolvedLeadId !== existing.lead_consultant_id || finalStartDate !== existing.start_date || finalEndDate !== existing.end_date)) {
            const start = new Date(finalStartDate);
            const end = new Date(finalEndDate);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: resolvedLeadId,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program',
                    sessionId: programId
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Lead consultant allocation conflict on ${dateStr}.`
                    });
                }
            }
        }

        let finalStaffIds = null;
        if (assigned_staff_ids !== undefined) {
            finalStaffIds = Array.isArray(assigned_staff_ids) ? assigned_staff_ids.filter(id => id !== null && id !== undefined) : [];
            if (finalStaffIds.length > 9) {
                return res.status(400).json({ success: false, message: 'Maximum 9 specialists can be assigned.' });
            }

            for (const staffId of finalStaffIds) {
                if (staffId === resolvedLeadId) {
                    return res.status(400).json({ success: false, message: 'Lead consultant cannot also be assigned as a specialist.' });
                }

                const staffRes = await query(
                    `SELECT tm.first_name, tm.last_name, tm.status, r.name AS role_name 
                     FROM team_members tm
                     JOIN roles r ON tm.role_id = r.id
                     WHERE tm.id = $1`,
                    [staffId]
                );
                if (!staffRes.rows.length) {
                    return res.status(404).json({ success: false, message: `Specialist ID ${staffId} not found.` });
                }
                const s = staffRes.rows[0];
                if (s.status !== 'active') {
                    return res.status(400).json({ success: false, message: `Specialist ${s.first_name} ${s.last_name} is not active.` });
                }
                const roleLower = s.role_name.toLowerCase();
                if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                    return res.status(400).json({ success: false, message: `Specialist ${s.first_name} ${s.last_name} must have a doctor or therapist role.` });
                }

                const start = new Date(finalStartDate);
                const end = new Date(finalEndDate);
                for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                    const dateStr = d.toISOString().split('T')[0];
                    const conflictCheck = await checkStaffAllocationConflict({
                        staffId,
                        date: dateStr,
                        timeStr: '00:00',
                        durationMins: 1440,
                        type: 'vedic_program',
                        sessionId: programId
                    });

                    if (conflictCheck.conflict) {
                        return res.status(400).json({
                            success: false,
                            message: `Specialist ${s.first_name} ${s.last_name} has conflict on ${dateStr}.`
                        });
                    }
                }
            }
        }

        const titleChanged = title && title.trim() !== existing.title.trim();
        const datesChanged = finalStartDate !== existing.start_date.toISOString().split('T')[0] || finalEndDate !== existing.end_date.toISOString().split('T')[0];
        
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
        if (resolvedLeadId !== undefined) { fields.push('lead_consultant_id = $' + idx++); values.push(resolvedLeadId); }
        if (services !== undefined) { fields.push('services = $' + idx++); values.push(JSON.stringify(services)); }
        if (languages !== undefined) { fields.push('languages = $' + idx++); values.push(JSON.stringify(languages)); }
        if (image_url !== undefined) { fields.push('image_url = $' + idx++); values.push(image_url); }
        if (registrationDeadline !== undefined) { fields.push('registration_deadline = $' + idx++); values.push(registrationDeadline || null); }

        values.push(programId);
        const result = await query(
            'UPDATE vedic_programs SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *',
            values
        );

        const updatedProgram = result.rows[0];

        if (finalStaffIds !== null) {
            const currentStaffRes = await query('SELECT staff_id FROM vedic_program_staff WHERE program_id = $1', [programId]);
            const currentStaffIds = currentStaffRes.rows.map(r => r.staff_id);

            await query('DELETE FROM vedic_program_staff WHERE program_id = $1', [programId]);
            
            const { sendVedicStaffAssignmentEmail } = require('../services/emailService');
            for (const staffId of finalStaffIds) {
                await query(
                    'INSERT INTO vedic_program_staff (program_id, staff_id, role) VALUES ($1, $2, $3)',
                    [programId, staffId, 'assigned_staff']
                );

                if (!currentStaffIds.includes(staffId)) {
                    const staffInfo = await query('SELECT first_name, last_name, email FROM team_members WHERE id = $1', [staffId]);
                    if (staffInfo.rows.length && staffInfo.rows[0].email) {
                        const s = staffInfo.rows[0];
                        try {
                            await sendVedicStaffAssignmentEmail({
                                to: s.email,
                                staffName: `${s.first_name} ${s.last_name}`,
                                programTitle: updatedProgram.title,
                                role: 'Specialist',
                                startDate: updatedProgram.start_date,
                                endDate: updatedProgram.end_date,
                                time: updatedProgram.time
                            });
                        } catch (err) {
                            console.error('Failed to send assignment email:', err);
                        }
                    }
                }
            }
        }

        if (titleChanged || datesChanged) {
            const { sendVedicUpdateEmail } = require('../services/emailService');
            let changesStr = '';
            if (titleChanged) changesStr += `Title changed to: ${updatedProgram.title}\n`;
            if (datesChanged) {
                changesStr += `Dates updated to: ${new Date(updatedProgram.start_date).toLocaleDateString()} to ${new Date(updatedProgram.end_date).toLocaleDateString()}\n`;
            }

            const attendeesRes = await query('SELECT name, email FROM vedic_attendees WHERE program_id = $1 AND status NOT IN (\'CANCELLED\')', [programId]);
            for (const a of attendeesRes.rows) {
                if (a.email) {
                    try {
                        await sendVedicUpdateEmail({
                            to: a.email,
                            userName: a.name,
                            programTitle: updatedProgram.title,
                            changes: changesStr
                        });
                    } catch (err) {
                        console.error('Failed to send update email to attendee:', err);
                    }
                }
            }

            if (updatedProgram.lead_consultant_id) {
                const leadRes = await query('SELECT first_name, last_name, email FROM team_members WHERE id = $1', [updatedProgram.lead_consultant_id]);
                if (leadRes.rows.length && leadRes.rows[0].email) {
                    try {
                        await sendVedicUpdateEmail({
                            to: leadRes.rows[0].email,
                            userName: `${leadRes.rows[0].first_name} ${leadRes.rows[0].last_name}`,
                            programTitle: updatedProgram.title,
                            changes: changesStr
                        });
                    } catch (err) {
                        console.error('Failed to send update email to lead:', err);
                    }
                }
            }

            const specialistsRes = await query(
                `SELECT tm.first_name, tm.last_name, tm.email 
                 FROM vedic_program_staff vps
                 JOIN team_members tm ON tm.id = vps.staff_id
                 WHERE vps.program_id = $1`,
                [programId]
            );
            for (const staff of specialistsRes.rows) {
                if (staff.email) {
                    try {
                        await sendVedicUpdateEmail({
                            to: staff.email,
                            userName: `${staff.first_name} ${staff.last_name}`,
                            programTitle: updatedProgram.title,
                            changes: changesStr
                        });
                    } catch (err) {
                        console.error('Failed to send update email to staff:', err);
                    }
                }
            }
        }

        await autoUpdateVedicProgramStatuses();

        return res.json({ success: true, message: 'Vedic Program updated.', program: updatedProgram });
    } catch (err) {
        console.error('updateVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET STAFF FOR VEDIC PROGRAM
const getVedicProgramStaff = async (req, res) => {
    const programId = req.params.id;
    try {
        const result = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role_name, vps.role AS program_role
             FROM vedic_program_staff vps
             JOIN team_members tm ON tm.id = vps.staff_id
             JOIN roles r ON r.id = tm.role_id
             WHERE vps.program_id = $1`,
            [programId]
        );
        return res.json({ success: true, staff: result.rows });
    } catch (err) {
        console.error('getVedicProgramStaff error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ALLOCATE / UPDATE STAFF FOR VEDIC PROGRAM (Admin)
const updateVedicProgramStaff = async (req, res) => {
    const { assigned_staff_ids } = req.body;
    const programId = req.params.id;

    if (!Array.isArray(assigned_staff_ids)) {
        return res.status(400).json({ success: false, message: 'assigned_staff_ids must be an array.' });
    }
    if (assigned_staff_ids.length > 9) {
        return res.status(400).json({ success: false, message: 'Maximum 9 specialists can be assigned.' });
    }

    try {
        const programRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!programRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = programRes.rows[0];

        const currentStatus = program.status || getVedicProgramStatus(program.start_date, program.end_date);
        if (currentStatus === 'Live' || currentStatus === 'Completed' || currentStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Cannot edit or reallocate staff for a program that is Live, Completed, or Cancelled.' });
        }

        const uniqueStaffIds = [...new Set(assigned_staff_ids.filter(id => id !== null && id !== undefined))];
        for (const staffId of uniqueStaffIds) {
            if (staffId === program.lead_consultant_id) {
                return res.status(400).json({ success: false, message: 'Lead consultant cannot also be assigned as a specialist.' });
            }

            const staffRes = await query(
                `SELECT tm.first_name, tm.last_name, tm.email, tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON tm.role_id = r.id
                 WHERE tm.id = $1`,
                [staffId]
            );
            if (!staffRes.rows.length) {
                return res.status(404).json({ success: false, message: `Staff member ID ${staffId} not found.` });
            }
            const staff = staffRes.rows[0];
            if (staff.status !== 'active') {
                return res.status(400).json({ success: false, message: `Staff member ${staff.first_name} ${staff.last_name} is not active.` });
            }
            const roleLower = staff.role_name.toLowerCase();
            if (roleLower !== 'doctor' && roleLower !== 'therapist') {
                return res.status(400).json({ success: false, message: `Staff member ${staff.first_name} ${staff.last_name} must have a doctor or therapist role.` });
            }

            const start = new Date(program.start_date);
            const end = new Date(program.end_date);
            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateStr = d.toISOString().split('T')[0];
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId: staffId,
                    date: dateStr,
                    timeStr: '00:00',
                    durationMins: 1440,
                    type: 'vedic_program',
                    sessionId: programId
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: `Staff allocation conflict for ${staff.first_name} ${staff.last_name} on ${dateStr}.`
                    });
                }
            }
        }

        const currentStaffRes = await query('SELECT staff_id FROM vedic_program_staff WHERE program_id = $1', [programId]);
        const currentStaffIds = currentStaffRes.rows.map(r => r.staff_id);

        await query('DELETE FROM vedic_program_staff WHERE program_id = $1', [programId]);

        const { sendVedicStaffAssignmentEmail } = require('../services/emailService');
        for (const staffId of uniqueStaffIds) {
            await query(
                'INSERT INTO vedic_program_staff (program_id, staff_id, role) VALUES ($1, $2, $3)',
                [programId, staffId, 'assigned_staff']
            );

            if (!currentStaffIds.includes(staffId)) {
                const staffInfo = await query('SELECT first_name, last_name, email FROM team_members WHERE id = $1', [staffId]);
                if (staffInfo.rows.length && staffInfo.rows[0].email) {
                    const s = staffInfo.rows[0];
                    try {
                        await sendVedicStaffAssignmentEmail({
                            to: s.email,
                            staffName: `${s.first_name} ${s.last_name}`,
                            programTitle: program.title,
                            role: 'Specialist',
                            startDate: program.start_date,
                            endDate: program.end_date,
                            time: program.time
                        });
                    } catch (err) {
                        console.error('Failed to send staff assignment email:', err);
                    }
                }
            }
        }

        await autoUpdateVedicProgramStatuses();

        return res.json({ success: true, message: 'Assigned staff updated successfully.' });
    } catch (err) {
        console.error('updateVedicProgramStaff error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// PUBLIC REGISTRATION ENDPOINT
const registerAttendee = async (req, res) => {
    const id = req.params.id || req.body.program_id || req.body.package_id || req.body.id || req.body.vedic_program_id || req.body.workshop_id || req.body.programId || req.body.packageId;
    const userObj = req.body.user || req.body;
    const name = userObj.name;
    const email = userObj.email;
    const phone = userObj.phone;
    const source = req.body.source || 'mobile';

    const accommodation_type = req.body.accommodationType || req.body.accommodation_type || null;
    const payment_status = (req.body.paymentStatus || req.body.payment_status || 'PENDING').toUpperCase();
    const checkin_date = req.body.checkInDate || req.body.checkin_date || null;
    const checkout_date = req.body.checkOutDate || req.body.checkout_date || null;
    const status = (req.body.status || 'REGISTERED').toUpperCase();

    // Validation rules
    const valErr = validateVedicAttendee({
        name,
        email,
        phone,
        status,
        accommodation_type,
        payment_status,
        checkin_date,
        checkout_date
    }, true);

    if (valErr) {
        return res.status(400).json({ success: false, message: valErr });
    }

    if (!id) {
        return res.status(400).json({ success: false, message: 'Program ID is required.' });
    }

    try {
        const progRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [id]);
        if (!progRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = progRes.rows[0];

        const programStatus = program.status || getVedicProgramStatus(program.start_date, program.end_date);
        if (programStatus !== 'Upcoming') {
            return res.status(400).json({ success: false, message: 'Registration is only allowed for upcoming programs.' });
        }

        if (program.enrolled >= program.capacity) {
            return res.status(400).json({ success: false, message: 'Program is at full capacity.' });
        }

        if (program.registration_deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(program.registration_deadline);
            if (today > deadline) {
                return res.status(400).json({ success: false, message: 'Registration has closed for this program.' });
            }
        }

        const attendeeCheck = await query('SELECT 1 FROM vedic_attendees WHERE program_id = $1 AND email = $2', [id, email.toLowerCase().trim()]);
        if (attendeeCheck.rows.length) {
            return res.status(400).json({ success: false, message: 'You are already registered for this program.' });
        }

        const result = await query(
            "INSERT INTO vedic_attendees (program_id, name, email, phone, status, source, accommodation_type, payment_status, check_in_date, check_out_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
            [id, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, status, source, accommodation_type, payment_status, checkin_date, checkout_date]
        );

        await query('UPDATE vedic_programs SET enrolled = enrolled + 1 WHERE id = $1', [id]);

        let assignedStaffStr = "None assigned";
        try {
            const staffList = [];
            if (program.lead_consultant_id) {
                const leadRes = await query("SELECT first_name, last_name, r.name as role_name FROM team_members tm JOIN roles r ON tm.role_id = r.id WHERE tm.id = $1", [program.lead_consultant_id]);
                if (leadRes.rows.length) {
                    const rName = leadRes.rows[0].role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                    staffList.push(`${rName} ${leadRes.rows[0].first_name} ${leadRes.rows[0].last_name} (Lead Consultant)`);
                }
            }
            const specsRes = await query(`
                SELECT tm.first_name, tm.last_name, r.name as role_name 
                FROM vedic_program_staff vps
                JOIN team_members tm ON vps.staff_id = tm.id
                JOIN roles r ON tm.role_id = r.id
                WHERE vps.program_id = $1
            `, [program.id]);
            for (const row of specsRes.rows) {
                const rName = row.role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                staffList.push(`${rName} ${row.first_name} ${row.last_name} (Specialist)`);
            }
            if (staffList.length > 0) {
                assignedStaffStr = staffList.join(", ");
            }
        } catch (staffErr) {
            console.error('Failed to fetch assigned staff for registration email:', staffErr);
        }

        const { sendVedicRegistrationEmail, sendVedicAdminRegistrationNotification } = require('../services/emailService');
        try {
            await sendVedicRegistrationEmail({
                to: email.toLowerCase().trim(),
                userName: name.trim(),
                programTitle: program.title,
                startDate: program.start_date,
                endDate: program.end_date,
                time: program.time,
                status: 'registered',
                assignedStaff: assignedStaffStr
            });
        } catch (err) {
            console.error('Failed to send registration confirmation email:', err);
        }

        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'prashmapoojary@gmail.com';
            await sendVedicAdminRegistrationNotification({
                to: adminEmail,
                participantName: name.trim(),
                participantEmail: email.toLowerCase().trim(),
                participantPhone: phone ? phone.trim() : null,
                programTitle: program.title
            });
        } catch (err) {
            console.error('Failed to send admin notification email:', err);
        }

        const attendee = result.rows[0];
        return res.status(201).json({
            success: true,
            status: 'success',
            message: 'Successfully registered for the program.',
            attendee: attendee,
            attendee_id: attendee.id
        });
    } catch (err) {
        console.error('registerAttendee error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ENROLL USER IN VEDIC PROGRAM (Admin manual enrollment)
const enrollUserInVedicProgram = async (req, res) => {
    const id = req.params.id || req.body.program_id || req.body.package_id || req.body.id || req.body.vedic_program_id || req.body.workshop_id || req.body.programId || req.body.packageId;
    const userObj = req.body.user || req.body;
    const name = userObj.name;
    const email = userObj.email;
    const phone = userObj.phone;
    const source = req.body.source || 'admin';

    const accommodation_type = req.body.accommodationType || req.body.accommodation_type || null;
    const payment_status = (req.body.paymentStatus || req.body.payment_status || 'PENDING').toUpperCase();
    const checkin_date = req.body.checkInDate || req.body.checkin_date || null;
    const checkout_date = req.body.checkOutDate || req.body.checkout_date || null;
    const status = (req.body.status || 'CONFIRMED').toUpperCase();

    // Validation rules
    const valErr = validateVedicAttendee({
        name,
        email,
        phone,
        status,
        accommodation_type,
        payment_status,
        checkin_date,
        checkout_date
    }, true);

    if (valErr) {
        return res.status(400).json({ success: false, message: valErr });
    }

    if (!id) {
        return res.status(400).json({ success: false, message: 'Program ID is required.' });
    }

    try {
        const progRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [id]);
        if (!progRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = progRes.rows[0];

        const programStatus = program.status || getVedicProgramStatus(program.start_date, program.end_date);
        if (programStatus === 'Live' || programStatus === 'Completed' || programStatus === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Enrollment is closed as this program is ongoing, completed, or cancelled.' });
        }

        if (program.enrolled >= program.capacity) {
            return res.status(400).json({ success: false, message: 'Program is at full capacity.' });
        }

        if (program.registration_deadline) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const deadline = new Date(program.registration_deadline);
            if (today > deadline) {
                return res.status(400).json({ success: false, message: 'Registration has closed for this program.' });
            }
        }

        const attendeeCheck = await query('SELECT 1 FROM vedic_attendees WHERE program_id = $1 AND email = $2', [id, email.toLowerCase().trim()]);
        if (attendeeCheck.rows.length) {
            return res.status(400).json({ success: false, message: 'User is already enrolled in this program.' });
        }

        const result = await query(
            "INSERT INTO vedic_attendees (program_id, name, email, phone, status, source, accommodation_type, payment_status, check_in_date, check_out_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *",
            [id, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null, status, source, accommodation_type, payment_status, checkin_date, checkout_date]
        );

        await query('UPDATE vedic_programs SET enrolled = enrolled + 1 WHERE id = $1', [id]);

        let assignedStaffStr = "None assigned";
        try {
            const staffList = [];
            if (program.lead_consultant_id) {
                const leadRes = await query("SELECT first_name, last_name, r.name as role_name FROM team_members tm JOIN roles r ON tm.role_id = r.id WHERE tm.id = $1", [program.lead_consultant_id]);
                if (leadRes.rows.length) {
                    const rName = leadRes.rows[0].role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                    staffList.push(`${rName} ${leadRes.rows[0].first_name} ${leadRes.rows[0].last_name} (Lead Consultant)`);
                }
            }
            const specsRes = await query(`
                SELECT tm.first_name, tm.last_name, r.name as role_name 
                FROM vedic_program_staff vps
                JOIN team_members tm ON vps.staff_id = tm.id
                JOIN roles r ON tm.role_id = r.id
                WHERE vps.program_id = $1
            `, [program.id]);
            for (const row of specsRes.rows) {
                const rName = row.role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                staffList.push(`${rName} ${row.first_name} ${row.last_name} (Specialist)`);
            }
            if (staffList.length > 0) {
                assignedStaffStr = staffList.join(", ");
            }
        } catch (staffErr) {
            console.error('Failed to fetch assigned staff for enrollment email:', staffErr);
        }

        const { sendVedicRegistrationEmail } = require('../services/emailService');
        try {
            await sendVedicRegistrationEmail({
                to: email.toLowerCase().trim(),
                userName: name.trim(),
                programTitle: program.title,
                startDate: program.start_date,
                endDate: program.end_date,
                time: program.time,
                status: 'confirmed',
                assignedStaff: assignedStaffStr
            });
        } catch (err) {
            console.error('Failed to send enrollment email to manually added user:', err);
        }

        const attendee = result.rows[0];
        return res.status(201).json({
            success: true,
            status: 'success',
            message: 'Successfully enrolled in program.',
            attendee: attendee,
            attendee_id: attendee.id
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
        const result = await query('SELECT * FROM vedic_attendees WHERE program_id = $1 ORDER BY created_at DESC', [id]);
        return res.json({
            success: true,
            status: 'success',
            program_id: id,
            attendees: result.rows
        });
    } catch (err) {
        console.error('getVedicProgramAttendees error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE VEDIC ATTENDEE ATTENDANCE STATUS (Admin Endpoint)
const updateVedicAttendeeAttendance = async (req, res) => {
    const attendeeId = req.params.attendeeId || req.params.id;
    const { status, accommodationType, accommodation_type, paymentStatus, payment_status, checkInDate, checkin_date, checkOutDate, checkout_date } = req.body;

    const accommodationVal = accommodationType !== undefined ? accommodationType : accommodation_type;
    const paymentVal = paymentStatus !== undefined ? paymentStatus : payment_status;
    const checkinVal = checkInDate !== undefined ? checkInDate : checkin_date;
    const checkoutVal = checkOutDate !== undefined ? checkOutDate : checkout_date;

    const valErr = validateVedicAttendee({
        status,
        accommodation_type: accommodationVal,
        payment_status: paymentVal,
        checkin_date: checkinVal,
        checkout_date: checkoutVal
    }, false);

    if (valErr) {
        return res.status(400).json({ success: false, message: valErr });
    }

    try {
        // Fetch current record
        const attRes = await query('SELECT * FROM vedic_attendees WHERE id = $1', [attendeeId]);
        if (!attRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }
        const current = attRes.rows[0];
        const programId = current.program_id;

        const finalStatus = status ? status.toUpperCase() : current.status;
        const finalAccommodation = accommodationVal !== undefined ? accommodationVal : current.accommodation_type;
        const finalPaymentStatus = paymentVal ? paymentVal.toUpperCase() : current.payment_status;
        const finalCheckinDate = checkinVal !== undefined ? checkinVal : current.check_in_date;
        const finalCheckoutDate = checkoutVal !== undefined ? checkoutVal : current.check_out_date;

        const result = await query(
            `UPDATE vedic_attendees 
             SET status = $1, accommodation_type = $2, payment_status = $3, check_in_date = $4, check_out_date = $5, updated_at = NOW() 
             WHERE id = $6 RETURNING *`,
            [finalStatus, finalAccommodation, finalPaymentStatus, finalCheckinDate || null, finalCheckoutDate || null, attendeeId]
        );

        // Send email notification upon status changes (e.g. status changed by admin)
        if (status && status.toUpperCase() !== current.status) {
            try {
                const progRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
                if (progRes.rows.length) {
                    const program = progRes.rows[0];
                    const { sendVedicRegistrationEmail } = require('../services/emailService');
                    
                    // Fetch assigned staff text for email
                    let assignedStaffStr = "None assigned";
                    try {
                        const staffList = [];
                        if (program.lead_consultant_id) {
                            const leadRes = await query("SELECT first_name, last_name, r.name as role_name FROM team_members tm JOIN roles r ON tm.role_id = r.id WHERE tm.id = $1", [program.lead_consultant_id]);
                            if (leadRes.rows.length) {
                                const rName = leadRes.rows[0].role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                                staffList.push(`${rName} ${leadRes.rows[0].first_name} ${leadRes.rows[0].last_name} (Lead Consultant)`);
                            }
                        }
                        const specsRes = await query(`
                            SELECT tm.first_name, tm.last_name, r.name as role_name 
                            FROM vedic_program_staff vps
                            JOIN team_members tm ON vps.staff_id = tm.id
                            JOIN roles r ON tm.role_id = r.id
                            WHERE vps.program_id = $1
                        `, [program.id]);
                        for (const row of specsRes.rows) {
                            const rName = row.role_name.toLowerCase() === 'doctor' ? 'Dr.' : 'Therapist';
                            staffList.push(`${rName} ${row.first_name} ${row.last_name} (Specialist)`);
                        }
                        if (staffList.length > 0) {
                            assignedStaffStr = staffList.join(", ");
                        }
                    } catch (staffErr) {
                        console.error('Failed to fetch assigned staff for status change email:', staffErr);
                    }

                    await sendVedicRegistrationEmail({
                        to: current.email,
                        userName: current.name,
                        programTitle: program.title,
                        startDate: program.start_date,
                        endDate: program.end_date,
                        time: program.time,
                        status: status.toLowerCase(),
                        assignedStaff: assignedStaffStr
                    });
                    console.log(`Notification email sent to ${current.email} for status update to ${status}.`);
                }
            } catch (emailErr) {
                console.error('Failed to send status update email notification:', emailErr);
            }
        }

        return res.json({ success: true, message: 'Attendee updated successfully.', attendee: result.rows[0] });
    } catch (err) {
        console.error('updateVedicAttendeeAttendance error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CHECK-IN ATTENDEE (Admin Endpoint)
const checkinAttendee = async (req, res) => {
    const attendeeId = req.params.attendeeId || req.params.id;
    try {
        const check = await query('SELECT 1 FROM vedic_attendees WHERE id = $1', [attendeeId]);
        if (!check.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }

        const result = await query(
            "UPDATE vedic_attendees SET status = 'CHECKED_IN', checked_in_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *",
            [attendeeId]
        );

        return res.json({ success: true, message: 'Attendee successfully checked in.', attendee: result.rows[0] });
    } catch (err) {
        console.error('checkinAttendee error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CANCEL VEDIC PROGRAM (Admin Endpoint)
const cancelVedicProgram = async (req, res) => {
    const programId = req.params.id;
    try {
        const programRes = await query('SELECT * FROM vedic_programs WHERE id = $1', [programId]);
        if (!programRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Program not found.' });
        }
        const program = programRes.rows[0];

        if (program.status === 'Cancelled') {
            return res.status(400).json({ success: false, message: 'Program is already cancelled.' });
        }

        await query("UPDATE vedic_programs SET status = 'Cancelled' WHERE id = $1", [programId]);
        await query("DELETE FROM allocations WHERE id LIKE $1", [`vp-alloc-${programId}%`]);

        const attendeesRes = await query(
            "SELECT name, email FROM vedic_attendees WHERE program_id = $1 AND status NOT IN ('CANCELLED')",
            [programId]
        );
        
        await query("UPDATE vedic_attendees SET status = 'CANCELLED', updated_at = NOW() WHERE program_id = $1 AND status NOT IN ('CANCELLED')", [programId]);

        const { sendVedicCancellationEmail } = require('../services/emailService');
        for (const attendee of attendeesRes.rows) {
            if (attendee.email) {
                try {
                    await sendVedicCancellationEmail({
                        to: attendee.email,
                        userName: attendee.name,
                        programTitle: program.title
                    });
                } catch (err) {
                    console.error(`Failed to send cancellation email to attendee ${attendee.email}:`, err);
                }
            }
        }

        if (program.lead_consultant_id) {
            const leadRes = await query("SELECT first_name, last_name, email FROM team_members WHERE id = $1", [program.lead_consultant_id]);
            if (leadRes.rows.length && leadRes.rows[0].email) {
                const lead = leadRes.rows[0];
                try {
                    await sendVedicCancellationEmail({
                        to: lead.email,
                        userName: `${lead.first_name} ${lead.last_name}`,
                        programTitle: program.title
                    });
                } catch (err) {
                    console.error('Failed to send cancellation email to lead consultant:', err);
                }
            }
        }

        const specialistsRes = await query(
            `SELECT tm.first_name, tm.last_name, tm.email 
             FROM vedic_program_staff vps
             JOIN team_members tm ON tm.id = vps.staff_id
             WHERE vps.program_id = $1`,
            [programId]
        );
        for (const staff of specialistsRes.rows) {
            if (staff.email) {
                try {
                    await sendVedicCancellationEmail({
                        to: staff.email,
                        userName: `${staff.first_name} ${staff.last_name}`,
                        programTitle: program.title
                    });
                } catch (err) {
                    console.error(`Failed to send cancellation email to specialist ${staff.email}:`, err);
                }
            }
        }

        await autoUpdateVedicProgramStatuses();

        return res.json({ success: true, message: 'Vedic Program cancelled successfully.' });
    } catch (err) {
        console.error('cancelVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE VEDIC PROGRAM ATTENDEE (Admin Endpoint)
const deleteVedicProgramAttendee = async (req, res) => {
    const attendeeId = req.params.attendeeId || req.params.id;
    try {
        const check = await query('SELECT * FROM vedic_attendees WHERE id = $1', [attendeeId]);
        if (!check.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }
        const attendee = check.rows[0];
        const programId = attendee.program_id;

        await query('DELETE FROM vedic_attendees WHERE id = $1', [attendeeId]);
        await query('UPDATE vedic_programs SET enrolled = GREATEST(0, enrolled - 1) WHERE id = $1', [programId]);

        const updatedRes = await query('SELECT * FROM vedic_attendees WHERE program_id = $1 ORDER BY created_at DESC', [programId]);
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

        const result = await query('SELECT name, email, phone, status, created_at FROM vedic_attendees WHERE program_id = $1 ORDER BY name ASC', [id]);
        
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

        const status = existing.status || getVedicProgramStatus(existing.start_date, existing.end_date);
        if (status === 'Live' || status === 'Completed') {
            return res.status(400).json({ success: false, message: 'Cannot delete a program that is currently Live or Completed.' });
        }

        const currentAllocations = await query('SELECT staff_id FROM allocations WHERE id LIKE $1', [`vp-alloc-${programId}%`]);
        await query('DELETE FROM allocations WHERE id LIKE $1', [`vp-alloc-${programId}%`]);
        await query('DELETE FROM vedic_programs WHERE id = $1', [programId]);

        const { syncStaffMemberStatus } = require('../utils/conflictChecker');
        for (const row of currentAllocations.rows) {
            await syncStaffMemberStatus(row.staff_id);
        }

        return res.json({ success: true, message: 'Vedic Program deleted successfully.' });
    } catch (err) {
        console.error('deleteVedicProgram error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const sendVedicProgramReminders = async () => {
    try {
        const { query } = require('../config/db');
        const { sendVedicReminderEmail } = require('../services/emailService');

        console.log('[Reminder Scheduler] Checking for Vedic Program reminders...');

        const res = await query("SELECT id, title, start_date, lead_consultant_id, status FROM vedic_programs WHERE status = 'Upcoming'");
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const p of res.rows) {
            const startDate = new Date(p.start_date);
            startDate.setHours(0, 0, 0, 0);

            const diffTime = startDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays === 7 || diffDays === 1) {
                console.log(`[Reminder Scheduler] Sending ${diffDays}-day reminders for: "${p.title}"`);

                const attendeesRes = await query(
                    "SELECT name, email FROM vedic_attendees WHERE program_id = $1 AND status IN ('REGISTERED', 'CONFIRMED')",
                    [p.id]
                );
                for (const a of attendeesRes.rows) {
                    if (a.email) {
                        try {
                            await sendVedicReminderEmail({
                                to: a.email,
                                userName: a.name,
                                programTitle: p.title,
                                daysRemaining: diffDays,
                                startDate: p.start_date,
                                time: p.time
                            });
                        } catch (err) {
                            console.error(`[Reminder Scheduler] Failed to send reminder email to attendee ${a.email}:`, err);
                        }
                    }
                }

                if (p.lead_consultant_id) {
                    const leadRes = await query("SELECT first_name, last_name, email FROM team_members WHERE id = $1", [p.lead_consultant_id]);
                    if (leadRes.rows.length && leadRes.rows[0].email) {
                        const l = leadRes.rows[0];
                        try {
                            await sendVedicReminderEmail({
                                to: l.email,
                                userName: `${l.first_name} ${l.last_name}`,
                                programTitle: p.title,
                                daysRemaining: diffDays,
                                startDate: p.start_date,
                                time: p.time
                            });
                        } catch (err) {
                            console.error(`[Reminder Scheduler] Failed to send reminder email to lead consultant ${l.email}:`, err);
                        }
                    }
                }

                const specialistsRes = await query(
                    `SELECT tm.first_name, tm.last_name, tm.email 
                     FROM vedic_program_staff vps
                     JOIN team_members tm ON tm.id = vps.staff_id
                     WHERE vps.program_id = $1`,
                    [p.id]
                );
                for (const s of specialistsRes.rows) {
                    if (s.email) {
                        try {
                            await sendVedicReminderEmail({
                                to: s.email,
                                userName: `${s.first_name} ${s.last_name}`,
                                programTitle: p.title,
                                daysRemaining: diffDays,
                                startDate: p.start_date,
                                time: p.time
                            });
                        } catch (err) {
                            console.error(`[Reminder Scheduler] Failed to send reminder email to specialist ${s.email}:`, err);
                        }
                    }
                }
            }
        }
    } catch (err) {
        console.error('[Reminder Scheduler] Error running reminders job:', err);
    }
};

// MOBILE ENDPOINT HOOK FOR VEDIC PACKAGES ENROLLMENT
const registerAttendeeFromMobile = async (req, res) => {
    const programId = req.body.program_id || req.body.package_id || req.body.id || req.body.vedic_program_id || req.body.workshop_id;
    if (!programId) {
        return res.status(400).json({ success: false, message: 'Program ID / Package ID is required.' });
    }
    req.params.id = programId;
    if (!req.body.source) {
        req.body.source = 'mobile';
    }
    return registerAttendee(req, res);
};

module.exports = {
    getAllVedicPrograms,
    createVedicProgram,
    updateVedicProgram,
    getVedicProgramStaff,
    updateVedicProgramStaff,
    registerAttendee,
    enrollUserInVedicProgram,
    getVedicProgramAttendees,
    updateVedicAttendeeAttendance,
    checkinAttendee,
    cancelVedicProgram,
    deleteVedicProgramAttendee,
    exportVedicProgramAttendees,
    deleteVedicProgram,
    autoUpdateVedicProgramStatuses,
    sendVedicProgramReminders,
    registerAttendeeFromMobile
};
