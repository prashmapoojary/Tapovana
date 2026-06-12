const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendAllocationEmail, sendWorkshopEnrollmentEmail } = require('../services/emailService');
const { checkStaffAllocationConflict, syncStaffMemberStatus } = require('../utils/conflictChecker');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (process.env.NODE_ENV === 'production') return; // Vercel filesystem is read-only
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// Helper: handle image save (base64 or URL)
const handleWorkshopImage = (imageData) => {
    if (!imageData || typeof imageData !== 'string') return null;

    const matches = imageData.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,(.+)$/);
    if (matches && matches.length === 4) {
        // In production (Vercel), filesystem is read-only — store base64 directly in DB
        if (process.env.NODE_ENV === 'production') {
            return imageData; // store as base64 string
        }
        const mime = matches[1];
        const extMap = {
            'image/jpeg': '.jpg', 'image/jpg': '.jpg', 'image/png': '.png',
            'image/gif': '.gif', 'image/webp': '.webp', 'image/svg+xml': '.svg'
        };
        const ext = extMap[mime] || '.png';
        const buffer = Buffer.from(matches[3], 'base64');
        const filename = uuidv4() + ext;
        ensureUploadsDir();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        return '/uploads/' + filename;
    }

    if (/^https?:\/\//.test(imageData) || imageData.startsWith('/uploads/')) {
        return imageData;
    }
    return imageData;
};

// Helper: Allocate staff to workshop
const allocateStaffToWorkshop = async (staffId, workshop) => {
    const allocationDetails = {
        id: workshop.id,
        type: 'workshop',
        sessionTitle: workshop.title,
        sessionId: workshop.id,
        startDate: workshop.date || new Date().toISOString(),
        endDate: workshop.date || null
    };

    await query(
        'UPDATE team_members SET availability_status = $1, allocation_details = $2::jsonb WHERE id = $3 AND status = $4',
        ['Allocated', JSON.stringify(allocationDetails), staffId, 'active']
    );

    // Send email
    try {
        const staffRes = await query('SELECT first_name, email FROM team_members WHERE id = $1', [staffId]);
        if (staffRes.rows.length) {
            const s = staffRes.rows[0];
            console.log('Attempting to send email to: ' + s.email + ' for workshop: ' + workshop.title);
            sendAllocationEmail({
                to: s.email,
                firstName: s.first_name,
                programName: workshop.title,
                programType: 'Workshop',
                startDate: workshop.date,
                endDate: workshop.date
            }).then(() => {
                console.log('Email sent successfully to ' + s.email);
            }).catch((err) => {
                console.error('Email send failed: ' + err.message);
            });
        }
    } catch (emailErr) {
        console.error('Email error: ' + emailErr.message);
    }
};

// Helper: Deallocate staff
const deallocateStaffMember = async (staffId) => {
    await query(
        'UPDATE team_members SET availability_status = $1, allocation_details = NULL WHERE id = $2 AND availability_status = $3',
        ['Available', staffId, 'Allocated']
    );
};

// Helper: Synchronize workshop allocations with allocations table and update staff status
const syncWorkshopAllocations = async (workshopId) => {
    try {
        const wsRes = await query('SELECT * FROM workshops WHERE id = $1', [workshopId]);
        if (!wsRes.rows.length) return;
        const workshop = wsRes.rows[0];

        const existingAllocRes = await query(`SELECT staff_id FROM allocations WHERE type = 'workshop' AND session_id = $1`, [String(workshopId)]);
        const oldStaffIds = existingAllocRes.rows.map(r => r.staff_id);

        await query(`DELETE FROM allocations WHERE type = 'workshop' AND session_id = $1`, [String(workshopId)]);

        const isCancelled = workshop.status === 'cancelled';
        if (!isCancelled) {
            const isCompleted = workshop.status === 'completed';
            const allocationStatus = isCompleted ? 'expired' : 'active';
            const staffIds = workshop.assigned_staff_ids || [];

            for (const staffId of staffIds) {
                const allocationId = `ws-alloc-${workshop.id}-${staffId}`;
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
                        workshop.title,
                        String(workshop.id),
                        workshop.date,
                        workshop.date,
                        workshop.time,
                        workshop.duration || 60,
                        allocationStatus
                    ]
                );
            }
        }

        const newStaffIds = isCancelled ? [] : (workshop.assigned_staff_ids || []);
        const allStaffIds = Array.from(new Set([...oldStaffIds, ...newStaffIds]));

        for (const staffId of allStaffIds) {
            await syncStaffMemberStatus(staffId);
        }
    } catch (err) {
        console.error('Error in syncWorkshopAllocations:', err);
    }
};

// GET ALL WORKSHOPS
const getAllWorkshops = async (req, res) => {
    try {
        const { category, status, page = 1, limit = 50 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (category && category !== 'ALL') { conditions.push('w.category = $' + idx++); values.push(category); }
        if (status && status !== 'ALL') { conditions.push('w.status = $' + idx++); values.push(status); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await query('SELECT COUNT(*) FROM workshops w ' + whereClause, values);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            'SELECT w.*, tm.first_name AS created_by_first_name, tm.last_name AS created_by_last_name FROM workshops w LEFT JOIN team_members tm ON tm.id = w.created_by ' + whereClause + ' ORDER BY w.date DESC LIMIT $' + idx + ' OFFSET $' + (idx + 1),
            [...values, parseInt(limit), offset]
        );

        return res.json({
            success: true,
            workshops: result.rows,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        console.error('getAllWorkshops error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET SINGLE WORKSHOP
const getWorkshopById = async (req, res) => {
    try {
        const result = await query(
            'SELECT w.*, tm.first_name AS created_by_first_name, tm.last_name AS created_by_last_name FROM workshops w LEFT JOIN team_members tm ON tm.id = w.created_by WHERE w.id = $1',
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        return res.json({ success: true, workshop: result.rows[0] });
    } catch (err) {
        console.error('getWorkshopById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CREATE WORKSHOP
const createWorkshop = async (req, res) => {
    const { title, category, instructor, date, time, duration, capacity, price, status, description, image_url, video_url, assigned_staff_ids } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: 'Workshop title is required.' });
    }

    try {
        const savedImageUrl = handleWorkshopImage(image_url);
        const staffIds = assigned_staff_ids || [];

        // Check scheduling conflict and daily limits for each staff
        for (const staffId of staffIds) {
            const conflictCheck = await checkStaffAllocationConflict({
                staffId,
                date: date,
                timeStr: time,
                durationMins: duration || 60,
                type: 'workshop'
            });

            if (conflictCheck.conflict) {
                return res.status(400).json({
                    success: false,
                    message: "Conflict: Staff already allocated at this time or daily limit exceeded."
                });
            }
        }

        const result = await query(
            'INSERT INTO workshops (title, category, instructor, date, time, duration, capacity, enrolled, price, status, description, image_url, video_url, assigned_staff_ids, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
            [
                title.trim(), category || null, instructor || null, date || null, time || null,
                duration || null, capacity || 20, 0, price || null,
                (status || 'upcoming').toLowerCase(), description || null,
                savedImageUrl, video_url || null, JSON.stringify(staffIds), req.user?.id || null
            ]
        );

        const workshop = result.rows[0];

        for (const staffId of staffIds) {
            await allocateStaffToWorkshop(staffId, workshop);
        }

        // Sync to unified allocations table
        await syncWorkshopAllocations(workshop.id);

        return res.status(201).json({ success: true, message: 'Workshop created.', workshop });
    } catch (err) {
        console.error('createWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE WORKSHOP
const updateWorkshop = async (req, res) => {
    const { title, category, instructor, date, time, duration, capacity, price, status, description, image_url, video_url, assigned_staff_ids } = req.body;

    try {
        const existingResult = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        if (!existingResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const existing = existingResult.rows[0];
        const oldStaffIds = existing.assigned_staff_ids || [];

        const targetDate = date !== undefined ? date : existing.date;
        const targetTime = time !== undefined ? time : existing.time;
        const targetDuration = duration !== undefined ? duration : existing.duration;

        let newStaffIds = oldStaffIds;
        if (assigned_staff_ids !== undefined) {
            newStaffIds = assigned_staff_ids;
        }

        // Check conflicts before updating
        if (assigned_staff_ids !== undefined || date !== undefined || time !== undefined || duration !== undefined) {
            for (const staffId of newStaffIds) {
                const conflictCheck = await checkStaffAllocationConflict({
                    staffId,
                    date: targetDate,
                    timeStr: targetTime,
                    durationMins: targetDuration || 60,
                    type: 'workshop',
                    sessionId: existing.id
                });

                if (conflictCheck.conflict) {
                    return res.status(400).json({
                        success: false,
                        message: "Conflict: Staff already allocated at this time or daily limit exceeded."
                    });
                }
            }
        }

        let savedImageUrl = undefined;
        if (image_url !== undefined) {
            savedImageUrl = handleWorkshopImage(image_url);
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (title !== undefined) { fields.push('title = $' + idx++); values.push(title?.trim() || null); }
        if (category !== undefined) { fields.push('category = $' + idx++); values.push(category || null); }
        if (instructor !== undefined) { fields.push('instructor = $' + idx++); values.push(instructor?.trim() || null); }
        if (date !== undefined) { fields.push('date = $' + idx++); values.push(date || null); }
        if (time !== undefined) { fields.push('time = $' + idx++); values.push(time || null); }
        if (duration !== undefined) { fields.push('duration = $' + idx++); values.push(duration || null); }
        if (capacity !== undefined) { fields.push('capacity = $' + idx++); values.push(capacity || null); }
        if (price !== undefined) { fields.push('price = $' + idx++); values.push(price || null); }
        if (status !== undefined) { fields.push('status = $' + idx++); values.push(status?.toLowerCase() || null); }
        if (description !== undefined) { fields.push('description = $' + idx++); values.push(description || null); }
        if (savedImageUrl !== undefined) { fields.push('image_url = $' + idx++); values.push(savedImageUrl); }
        if (video_url !== undefined) { fields.push('video_url = $' + idx++); values.push(video_url || null); }

        if (assigned_staff_ids !== undefined) {
            fields.push('assigned_staff_ids = $' + idx++);
            values.push(JSON.stringify(assigned_staff_ids));

            const removedStaff = oldStaffIds.filter(id => !assigned_staff_ids.includes(id));
            const addedStaff = assigned_staff_ids.filter(id => !oldStaffIds.includes(id));

            for (const staffId of removedStaff) {
                await deallocateStaffMember(staffId);
            }

            const allocData = { ...existing, title: title || existing.title, date: date || existing.date };
            for (const staffId of addedStaff) {
                await allocateStaffToWorkshop(staffId, allocData);
            }
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(req.params.id);
        const result = await query(
            'UPDATE workshops SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *',
            values
        );

        // Sync workshop allocations
        await syncWorkshopAllocations(req.params.id);

        return res.json({ success: true, message: 'Workshop updated.', workshop: result.rows[0] });
    } catch (err) {
        console.error('updateWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE WORKSHOP
const deleteWorkshop = async (req, res) => {
    try {
        const existing = await query('SELECT assigned_staff_ids FROM workshops WHERE id = $1', [req.params.id]);
        const oldStaffIds = existing.rows.length && existing.rows[0].assigned_staff_ids ? existing.rows[0].assigned_staff_ids : [];

        for (const staffId of oldStaffIds) {
            await deallocateStaffMember(staffId);
        }

        const result = await query('DELETE FROM workshops WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        // Clean up allocations table
        await query(`DELETE FROM allocations WHERE type = 'workshop' AND session_id = $1`, [String(req.params.id)]);

        // Sync old staff members
        for (const staffId of oldStaffIds) {
            await syncStaffMemberStatus(staffId);
        }

        return res.json({ success: true, message: 'Workshop deleted.' });
    } catch (err) {
        console.error('deleteWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// WORKSHOP STAFF ALLOCATION
const updateWorkshopStaff = async (req, res) => {
    const { assigned_staff_ids } = req.body;
    if (!Array.isArray(assigned_staff_ids)) {
        return res.status(400).json({ success: false, message: 'assigned_staff_ids must be an array.' });
    }

    try {
        const wsResult = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        if (!wsResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        const workshop = wsResult.rows[0];
        const oldStaffIds = workshop.assigned_staff_ids || [];

        // Check conflict for all new assigned_staff_ids
        for (const staffId of assigned_staff_ids) {
            const conflictCheck = await checkStaffAllocationConflict({
                staffId,
                date: workshop.date,
                timeStr: workshop.time,
                durationMins: workshop.duration || 60,
                type: 'workshop',
                sessionId: workshop.id
            });

            if (conflictCheck.conflict) {
                return res.status(400).json({
                    success: false,
                    message: "Conflict: Staff already allocated at this time or daily limit exceeded."
                });
            }
        }

        const removedStaff = oldStaffIds.filter(id => !assigned_staff_ids.includes(id));
        const addedStaff = assigned_staff_ids.filter(id => !oldStaffIds.includes(id));

        await query('UPDATE workshops SET assigned_staff_ids = $1 WHERE id = $2', [JSON.stringify(assigned_staff_ids), req.params.id]);

        for (const staffId of removedStaff) {
            await deallocateStaffMember(staffId);
        }
        for (const staffId of addedStaff) {
            await allocateStaffToWorkshop(staffId, workshop);
        }

        // Sync workshop allocations
        await syncWorkshopAllocations(workshop.id);

        const updated = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        return res.json({ success: true, message: 'Staff allocations updated.', workshop: updated.rows[0] });
    } catch (err) {
        console.error('updateWorkshopStaff error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// COMPLETE WORKSHOP ALLOCATION
const completeWorkshopAllocation = async (req, res) => {
    const { staff_id } = req.body;
    if (!staff_id) {
        return res.status(400).json({ success: false, message: 'staff_id is required.' });
    }

    try {
        const wsResult = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        if (!wsResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        const workshop = wsResult.rows[0];
        let staffIds = workshop.assigned_staff_ids || [];
        staffIds = staffIds.filter(id => id !== staff_id);

        await query('UPDATE workshops SET assigned_staff_ids = $1 WHERE id = $2', [JSON.stringify(staffIds), req.params.id]);
        await deallocateStaffMember(staff_id);

        // Sync workshop allocations
        await syncWorkshopAllocations(workshop.id);

        return res.json({ success: true, message: 'Staff allocation completed. Staff is now Available.' });
    } catch (err) {
        console.error('completeWorkshopAllocation error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ENROLL USER IN WORKSHOP (Public Mobile Endpoint)
const enrollUserInWorkshop = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    try {
        const wsRes = await query('SELECT * FROM workshops WHERE id = $1', [id]);
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshop = wsRes.rows[0];

        // Capacity check
        if (workshop.enrolled >= workshop.capacity) {
            return res.status(400).json({ success: false, message: 'Workshop is already at full capacity.' });
        }

        // Already enrolled check
        const attendeeCheck = await query('SELECT 1 FROM attendees WHERE workshop_id = $1 AND email = $2', [id, email.toLowerCase().trim()]);
        if (attendeeCheck.rows.length) {
            return res.status(400).json({ success: false, message: 'User is already enrolled in this workshop.' });
        }

        // Send confirmation notification/email FIRST
        try {
            await sendWorkshopEnrollmentEmail({
                to: email.toLowerCase().trim(),
                userName: name.trim(),
                workshopTitle: workshop.title,
                date: workshop.date,
                time: workshop.time
            });
            console.log(`Enrollment email sent to ${email} for workshop: ${workshop.title}`);
        } catch (emailErr) {
            console.error('Failed to send workshop enrollment email:', emailErr);
        }

        // Insert enrollment
        const result = await query(
            'INSERT INTO attendees (workshop_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null]
        );

        // Update enrolled count
        await query('UPDATE workshops SET enrolled = enrolled + 1 WHERE id = $1', [id]);

        return res.status(201).json({
            success: true,
            message: 'Successfully enrolled in workshop.',
            attendee: result.rows[0]
        });
    } catch (err) {
        console.error('enrollUserInWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET WORKSHOP ATTENDEES (Admin Endpoint)
const getWorkshopAttendees = async (req, res) => {
    const { id } = req.params;
    try {
        const result = await query('SELECT * FROM attendees WHERE workshop_id = $1 ORDER BY created_at DESC', [id]);
        return res.json({ success: true, attendees: result.rows });
    } catch (err) {
        console.error('getWorkshopAttendees error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE ATTENDEE ATTENDANCE STATUS (Admin Endpoint)
const updateAttendeeAttendance = async (req, res) => {
    const { id, attendeeId } = req.params;
    const { status } = req.body;

    if (!['enrolled', 'attended', 'absent'].includes(status)) {
        return res.status(400).json({ success: false, message: "Status must be 'enrolled', 'attended', or 'absent'." });
    }

    try {
        const result = await query(
            'UPDATE attendees SET status = $1, updated_at = NOW() WHERE workshop_id = $2 AND id = $3 RETURNING *',
            [status, id, attendeeId]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }

        return res.json({ success: true, message: 'Attendance status updated.', attendee: result.rows[0] });
    } catch (err) {
        console.error('updateAttendeeAttendance error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// EXPORT WORKSHOP ATTENDEES (Admin Endpoint)
const exportWorkshopAttendees = async (req, res) => {
    const { id } = req.params;
    try {
        const wsRes = await query('SELECT title FROM workshops WHERE id = $1', [id]);
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshopTitle = wsRes.rows[0].title;

        const result = await query('SELECT name, email, phone, status, created_at FROM attendees WHERE workshop_id = $1 ORDER BY name ASC', [id]);
        
        let csvContent = 'Name,Email,Phone,Status,Enrolled At\n';
        for (const row of result.rows) {
            const enrolledAt = row.created_at ? new Date(row.created_at).toISOString() : '';
            csvContent += `"${row.name.replace(/"/g, '""')}","${row.email.replace(/"/g, '""')}","${(row.phone || '').replace(/"/g, '""')}","${row.status}","${enrolledAt}"\n`;
        }

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="attendees-${workshopTitle.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
        return res.send(csvContent);
    } catch (err) {
        console.error('exportWorkshopAttendees error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = {
    getAllWorkshops, getWorkshopById, createWorkshop,
    updateWorkshop, deleteWorkshop,
    updateWorkshopStaff, completeWorkshopAllocation,
    enrollUserInWorkshop, getWorkshopAttendees,
    updateAttendeeAttendance, exportWorkshopAttendees
};