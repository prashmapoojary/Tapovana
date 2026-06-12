const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendAllocationEmail, sendWorkshopEnrollmentEmail, sendWorkshopRemovalEmail, sendWorkshopScheduledEmail, sendWorkshopOngoingEmail, sendWorkshopDeallocationEmail } = require('../services/emailService');
const { checkStaffAllocationConflict, syncStaffMemberStatus } = require('../utils/conflictChecker');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (process.env.NODE_ENV === 'production') return; // Vercel filesystem is read-only
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// HELPER: Dynamic Status Transition & Notifications
function getStatus(wsDate, wsTime, wsDuration) {
    const now = new Date();
    
    // Parse workshop date
    const [wsYear, wsMonth, wsDay] = wsDate.split('-').map(Number);
    
    let hours = 0;
    let minutes = 0;
    if (wsTime) {
        const match = wsTime.match(/(\d+):(\d+)\s*(AM|PM)/i);
        if (match) {
            hours = parseInt(match[1], 10);
            minutes = parseInt(match[2], 10);
            if (match[3].toUpperCase() === 'PM' && hours !== 12) hours += 12;
            if (match[3].toUpperCase() === 'AM' && hours === 12) hours = 0;
        } else {
            const parts = wsTime.split(':');
            hours = parseInt(parts[0], 10) || 0;
            minutes = parseInt(parts[1], 10) || 0;
        }
    }
    
    const startTime = new Date(wsYear, wsMonth - 1, wsDay, hours, minutes, 0, 0);
    const durationMins = parseInt(wsDuration, 10) || 60;
    const endTime = new Date(startTime.getTime() + durationMins * 60000);
    
    if (now < startTime) {
        return 'upcoming';
    } else if (now >= startTime && now <= endTime) {
        return 'ongoing';
    } else {
        return 'completed';
    }
}

async function validateWorkshopActions(workshopId) {
    const wsRes = await query('SELECT date, time, duration, status FROM workshops WHERE id = $1', [workshopId]);
    if (!wsRes.rows.length) {
        throw new Error('Workshop not found.');
    }
    const w = wsRes.rows[0];
    
    let dateStr = w.date;
    if (w.date instanceof Date) {
        const year = w.date.getFullYear();
        const month = String(w.date.getMonth() + 1).padStart(2, '0');
        const day = String(w.date.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
    }

    const calculatedStatus = getStatus(dateStr, w.time, w.duration);
    if (calculatedStatus === 'completed') {
        throw new Error('This workshop is completed. Staff assignment and enrollment are disabled.');
    }
}

// Helper: handle image save (base64 or URL)
const handleWorkshopImage = (imageData) => {
    if (!imageData || typeof imageData !== 'string') return null;

    const matches = imageData.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
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
        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
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

// Helper: handle video save (base64 or URL)
const handleWorkshopVideo = (videoData) => {
    if (!videoData || typeof videoData !== 'string') return null;

    const matches = videoData.match(/^data:(video\/(mp4|webm|ogg|quicktime));base64,([\s\S]+)$/);
    if (matches && matches.length === 4) {
        // In production (Vercel), filesystem is read-only — store base64 directly in DB
        if (process.env.NODE_ENV === 'production') {
            return videoData; // store as base64 string
        }
        const mime = matches[1];
        const extMap = {
            'video/mp4': '.mp4', 'video/webm': '.webm', 'video/ogg': '.ogv', 'video/quicktime': '.mov'
        };
        const ext = extMap[mime] || '.mp4';
        const buffer = Buffer.from(matches[3].replace(/\s/g, ''), 'base64');
        const filename = uuidv4() + ext;
        ensureUploadsDir();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        return '/uploads/' + filename;
    }

    if (/^https?:\/\//.test(videoData) || videoData.startsWith('/uploads/')) {
        return videoData;
    }
    return videoData;
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
        await autoUpdateWorkshopStatuses();
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

        const workshops = [];
        for (const w of result.rows) {
            const hasVideoRes = await query('SELECT EXISTS(SELECT 1 FROM workshop_videos WHERE workshop_id = $1)', [w.id]);
            if (hasVideoRes.rows[0].exists) {
                w.video_url = `/api/workshops/${w.id}/video`;
            }
            workshops.push(w);
        }

        return res.json({
            success: true,
            workshops,
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

        const workshop = result.rows[0];
        const hasVideoRes = await query('SELECT EXISTS(SELECT 1 FROM workshop_videos WHERE workshop_id = $1)', [workshop.id]);
        if (hasVideoRes.rows[0].exists) {
            workshop.video_url = `/api/workshops/${workshop.id}/video`;
        }

        return res.json({ success: true, workshop });
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

    // Restriction: Cannot select a previous day (timezone-safe check)
    if (date) {
        const todayStr = new Date().toISOString().split('T')[0];
        if (date < todayStr) {
            return res.status(400).json({ success: false, message: "Cannot schedule a workshop on a past date." });
        }
    }

    try {
        const savedImageUrl = handleWorkshopImage(image_url);
        const savedVideoUrl = handleWorkshopVideo(video_url);
        const staffIds = assigned_staff_ids || [];

        // Check for duplicates: title + date/time + instructor
        const duplicateCheck = await query(
            'SELECT id, assigned_staff_ids FROM workshops WHERE LOWER(title) = LOWER($1) AND date = $2 AND time = $3 AND COALESCE(instructor, \'\') = COALESCE($4, \'\')',
            [title.trim(), date || null, time || null, instructor || null]
        );
        let duplicateDetected = false;
        if (duplicateCheck.rows.length > 0) {
            duplicateDetected = true;
            const duplicateIds = duplicateCheck.rows.map(r => r.id);
            
            // Delete duplicates first to free up allocated staff and remove records
            await query('DELETE FROM workshops WHERE id = ANY($1)', [duplicateIds]);
            
            // Deallocate the old staff associated with those deleted duplicates
            for (const row of duplicateCheck.rows) {
                const oldStaff = row.assigned_staff_ids || [];
                for (const oldStaffId of oldStaff) {
                    await deallocateStaffMember(oldStaffId);
                    await syncStaffMemberStatus(oldStaffId);
                }
            }
        }

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
            'INSERT INTO workshops (title, category, instructor, date, time, duration, capacity, enrolled, price, status, description, image_url, video_url, assigned_staff_ids, created_by, allocation_count, instructor_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17) RETURNING *',
            [
                title.trim(), category || null, instructor || null, date || null, time || null,
                duration || null, 10000, 0, price || null,
                (status || 'upcoming').toLowerCase(), description || null,
                savedImageUrl, savedVideoUrl, JSON.stringify(staffIds), req.user?.id || null,
                staffIds.length > 0 ? 1 : 0,
                staffIds.length > 0 ? staffIds[0] : null
            ]
        );

        const workshop = result.rows[0];

        for (const staffId of staffIds) {
            await allocateStaffToWorkshop(staffId, workshop);
        }

        // Sync to unified allocations table
        await syncWorkshopAllocations(workshop.id);

        if (duplicateDetected) {
            return res.status(201).json({ success: true, message: 'Duplicate workshop removed automatically.', workshop });
        } else {
            return res.status(201).json({ success: true, message: 'Workshop created.', workshop });
        }
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

        const targetTitle = title !== undefined ? title : existing.title;
        const targetDate = date !== undefined ? date : existing.date;
        const targetTime = time !== undefined ? time : existing.time;
        const targetDuration = duration !== undefined ? duration : existing.duration;
        const targetInstructor = instructor !== undefined ? instructor : existing.instructor;

        let duplicateDetected = false;
        if (targetTitle && targetDate && targetTime) {
            const duplicateCheck = await query(
                'SELECT id, assigned_staff_ids FROM workshops WHERE LOWER(title) = LOWER($1) AND date = $2 AND time = $3 AND COALESCE(instructor, \'\') = COALESCE($4, \'\') AND id != $5',
                [targetTitle.trim(), targetDate, targetTime, targetInstructor || null, req.params.id]
            );
            if (duplicateCheck.rows.length > 0) {
                duplicateDetected = true;
                const duplicateIds = duplicateCheck.rows.map(r => r.id);
                
                // Delete duplicates first to free up allocated staff and remove records
                await query('DELETE FROM workshops WHERE id = ANY($1)', [duplicateIds]);
                
                // Deallocate the old staff associated with those deleted duplicates
                for (const row of duplicateCheck.rows) {
                    const oldStaff = row.assigned_staff_ids || [];
                    for (const oldStaffId of oldStaff) {
                        await deallocateStaffMember(oldStaffId);
                        await syncStaffMemberStatus(oldStaffId);
                    }
                }
            }
        }

        let newStaffIds = oldStaffIds;
        let finalAllocationCount = existing.allocation_count || 0;

        if (assigned_staff_ids !== undefined) {
            try {
                await validateWorkshopActions(req.params.id);
            } catch (valErr) {
                return res.status(400).json({ success: false, message: valErr.message });
            }
            newStaffIds = assigned_staff_ids;
            const isStaffChanged = JSON.stringify(oldStaffIds.sort()) !== JSON.stringify(newStaffIds.sort());

            if (isStaffChanged && newStaffIds.length > 0) {
                if (existing.allocation_count >= 2) {
                    return res.status(400).json({
                        success: false,
                        message: "Staff allocation limit reached. Only two allocations allowed."
                    });
                }
                finalAllocationCount = (existing.allocation_count || 0) + 1;

                // Send deallocation email to old staff members
                for (const oldStaffId of oldStaffIds) {
                    if (!newStaffIds.includes(oldStaffId)) {
                        try {
                            const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [oldStaffId]);
                            if (staffRes.rows.length) {
                                const s = staffRes.rows[0];
                                await sendWorkshopDeallocationEmail({
                                    to: s.email,
                                    staffName: `${s.first_name} ${s.last_name}`.trim(),
                                    workshopTitle: existing.title
                                });
                            }
                        } catch (err) {
                            console.error('Failed to send deallocation email:', err);
                        }
                    }
                }
            }
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

        let savedVideoUrl = undefined;
        if (video_url !== undefined) {
            savedVideoUrl = handleWorkshopVideo(video_url);
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
        if (savedVideoUrl !== undefined) { fields.push('video_url = $' + idx++); values.push(savedVideoUrl); }

        if (assigned_staff_ids !== undefined) {
            fields.push('assigned_staff_ids = $' + idx++);
            values.push(JSON.stringify(assigned_staff_ids));

            fields.push('allocation_count = $' + idx++);
            values.push(finalAllocationCount);

            fields.push('instructor_id = $' + idx++);
            values.push(assigned_staff_ids && assigned_staff_ids.length > 0 ? assigned_staff_ids[0] : null);

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

        return res.json({ 
            success: true, 
            message: duplicateDetected ? 'Duplicate workshop removed automatically.' : 'Workshop updated.', 
            workshop: result.rows[0] 
        });
    } catch (err) {
        console.error('updateWorkshop error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE WORKSHOP
const deleteWorkshop = async (req, res) => {
    try {
        const wsRes = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshop = wsRes.rows[0];

        // Format date string for parsing status
        let dateStr = workshop.date;
        if (workshop.date instanceof Date) {
            const year = workshop.date.getFullYear();
            const month = String(workshop.date.getMonth() + 1).padStart(2, '0');
            const day = String(workshop.date.getDate()).padStart(2, '0');
            dateStr = `${year}-${month}-${day}`;
        }

        const calculatedStatus = getStatus(dateStr, workshop.time, workshop.duration);
        if (calculatedStatus === 'ongoing') {
            return res.status(400).json({ success: false, message: "Cannot delete an ongoing workshop." });
        }

        const oldStaffIds = workshop.assigned_staff_ids || [];
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
        try {
            await validateWorkshopActions(req.params.id);
        } catch (valErr) {
            return res.status(400).json({ success: false, message: valErr.message });
        }

        const wsResult = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
        if (!wsResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }

        const workshop = wsResult.rows[0];
        const oldStaffIds = workshop.assigned_staff_ids || [];

        const isStaffChanged = JSON.stringify(oldStaffIds.sort()) !== JSON.stringify(assigned_staff_ids.sort());
        let finalAllocationCount = workshop.allocation_count || 0;

        if (isStaffChanged && assigned_staff_ids.length > 0) {
            if (workshop.allocation_count >= 2) {
                return res.status(400).json({
                    success: false,
                    message: "Staff allocation limit reached. Only two allocations allowed."
                });
            }
            finalAllocationCount = (workshop.allocation_count || 0) + 1;
            
            // Send deallocation email to old staff members
            for (const oldStaffId of oldStaffIds) {
                if (!assigned_staff_ids.includes(oldStaffId)) {
                    try {
                        const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [oldStaffId]);
                        if (staffRes.rows.length) {
                            const s = staffRes.rows[0];
                            await sendWorkshopDeallocationEmail({
                                to: s.email,
                                staffName: `${s.first_name} ${s.last_name}`.trim(),
                                workshopTitle: workshop.title
                            });
                        }
                    } catch (err) {
                        console.error('Failed to send deallocation email:', err);
                    }
                }
            }
        }

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

        await query('UPDATE workshops SET assigned_staff_ids = $1, allocation_count = $2 WHERE id = $3', [JSON.stringify(assigned_staff_ids), finalAllocationCount, req.params.id]);

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

// ENROLL USER IN WORKSHOP (Public Mobile Endpoint / Admin manual)
const enrollUserInWorkshop = async (req, res) => {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name || !email) {
        return res.status(400).json({ success: false, message: 'Name and Email are required.' });
    }

    try {
        try {
            await validateWorkshopActions(id);
        } catch (valErr) {
            return res.status(400).json({ success: false, message: valErr.message });
        }

        const wsRes = await query('SELECT * FROM workshops WHERE id = $1', [id]);
        if (!wsRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Workshop not found.' });
        }
        const workshop = wsRes.rows[0];

        // Capacity check (allow up to 10000)
        const maxCapacity = Math.max(workshop.capacity || 0, 10000);
        if (workshop.enrolled >= maxCapacity) {
            return res.status(400).json({ success: false, message: 'Workshop is already at full capacity.' });
        }

        // Already enrolled check
        const attendeeCheck = await query('SELECT 1 FROM attendees WHERE workshop_id = $1 AND email = $2', [id, email.toLowerCase().trim()]);
        if (attendeeCheck.rows.length) {
            return res.status(400).json({ success: false, message: 'User is already enrolled in this workshop.' });
        }

        // Insert enrollment first
        const result = await query(
            'INSERT INTO attendees (workshop_id, name, email, phone) VALUES ($1, $2, $3, $4) RETURNING *',
            [id, name.trim(), email.toLowerCase().trim(), phone ? phone.trim() : null]
        );

        // Send confirmation notification/email synchronously AFTER database insert but before final response
        try {
            await sendWorkshopEnrollmentEmail({
                to: email.toLowerCase().trim(),
                userName: name.trim(),
                workshopTitle: workshop.title,
                date: workshop.date,
                time: workshop.time,
                instructorName: workshop.instructor
            });
            console.log(`Enrollment email sent to ${email} for workshop: ${workshop.title}`);
        } catch (emailErr) {
            console.error('Failed to send workshop enrollment email:', emailErr);
        }

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

// DELETE WORKSHOP ATTENDEE (Admin Endpoint)
const deleteWorkshopAttendee = async (req, res) => {
    const { id, attendeeId } = req.params;
    try {
        const attendeeRes = await query('SELECT * FROM attendees WHERE id = $1 AND workshop_id = $2', [attendeeId, id]);
        if (!attendeeRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Attendee record not found.' });
        }
        const attendee = attendeeRes.rows[0];

        const wsRes = await query('SELECT title FROM workshops WHERE id = $1', [id]);
        const workshopTitle = wsRes.rows.length ? wsRes.rows[0].title : 'Workshop';

        await query('DELETE FROM attendees WHERE id = $1 AND workshop_id = $2', [attendeeId, id]);
        await query('UPDATE workshops SET enrolled = GREATEST(0, enrolled - 1) WHERE id = $1', [id]);

        try {
            await sendWorkshopRemovalEmail({
                to: attendee.email,
                userName: attendee.name,
                workshopTitle: workshopTitle
            });
            console.log(`Removal email sent to ${attendee.email} for workshop: ${workshopTitle}`);
        } catch (emailErr) {
            console.error('Failed to send workshop removal email:', emailErr);
        }

        const updatedRes = await query('SELECT * FROM attendees WHERE workshop_id = $1 ORDER BY created_at DESC', [id]);
        return res.json({ success: true, message: 'Attendee deleted.', attendees: updatedRes.rows });
    } catch (err) {
        console.error('deleteWorkshopAttendee error:', err);
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



const autoUpdateWorkshopStatuses = async () => {
    try {
        const res = await query(`
            SELECT id, title, date, time, duration, status, assigned_staff_ids, upcoming_notified, ongoing_notified 
            FROM workshops 
            WHERE status != 'completed'
        `);
        for (const w of res.rows) {
            let dateStr = w.date;
            if (w.date instanceof Date) {
                const year = w.date.getFullYear();
                const month = String(w.date.getMonth() + 1).padStart(2, '0');
                const day = String(w.date.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            const newStatus = getStatus(dateStr, w.time, w.duration);
            
            let upNotified = w.upcoming_notified;
            let onNotified = w.ongoing_notified;
            
            // 1. Send scheduled notifications if upcoming and not notified
            if (newStatus === 'upcoming' && !upNotified) {
                // Send to attendees
                const attendeesRes = await query('SELECT email, name FROM attendees WHERE workshop_id = $1', [w.id]);
                for (const att of attendeesRes.rows) {
                    await sendWorkshopScheduledEmail({
                        to: att.email,
                        staffOrParticipantName: att.name,
                        workshopTitle: w.title,
                        date: dateStr,
                        time: w.time
                    });
                }

                // Send to staff
                const staffIds = w.assigned_staff_ids || [];
                for (const staffId of staffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        await sendWorkshopScheduledEmail({
                            to: s.email,
                            staffOrParticipantName: `${s.first_name} ${s.last_name}`.trim(),
                            workshopTitle: w.title,
                            date: dateStr,
                            time: w.time
                        });
                    }
                }
                upNotified = true;
            }
            
            // 2. Send ongoing notifications if ongoing and not notified
            if (newStatus === 'ongoing' && !onNotified) {
                const attendeesRes = await query('SELECT email, name FROM attendees WHERE workshop_id = $1', [w.id]);
                for (const att of attendeesRes.rows) {
                    await sendWorkshopOngoingEmail({
                        to: att.email,
                        staffOrParticipantName: att.name,
                        workshopTitle: w.title
                    });
                }
                
                const staffIds = w.assigned_staff_ids || [];
                for (const staffId of staffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        await sendWorkshopOngoingEmail({
                            to: s.email,
                            staffOrParticipantName: `${s.first_name} ${s.last_name}`.trim(),
                            workshopTitle: w.title
                        });
                    }
                }
                onNotified = true;
            }
            
            if (newStatus !== w.status || upNotified !== w.upcoming_notified || onNotified !== w.ongoing_notified) {
                await query(
                    `UPDATE workshops 
                     SET status = $1, upcoming_notified = $2, ongoing_notified = $3 
                     WHERE id = $4`,
                    [newStatus, upNotified, onNotified, w.id]
                );
            }
        }
    } catch (err) {
        console.error('Error in autoUpdateWorkshopStatuses:', err);
    }
};

// UPLOAD VIDEO CHUNK
const uploadVideoChunk = async (req, res) => {
    const { id } = req.params;
    const { chunkIndex, chunkSize, byteOffset, totalSize, filename, mimeType, data } = req.body;
    try {
        const buffer = Buffer.from(data, 'base64');
        await query(
            `INSERT INTO workshop_videos (workshop_id, chunk_index, chunk_size, byte_offset, total_size, data, filename, mime_type)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             ON CONFLICT (workshop_id, chunk_index) DO UPDATE SET
                chunk_size = EXCLUDED.chunk_size,
                byte_offset = EXCLUDED.byte_offset,
                total_size = EXCLUDED.total_size,
                data = EXCLUDED.data,
                filename = EXCLUDED.filename,
                mime_type = EXCLUDED.mime_type`,
            [id, chunkIndex, chunkSize, byteOffset, totalSize, buffer, filename, mimeType]
        );
        return res.json({ success: true, message: `Chunk ${chunkIndex} uploaded.` });
    } catch (err) {
        console.error('uploadVideoChunk error:', err);
        return res.status(500).json({ success: false, message: 'Failed to upload chunk.' });
    }
};

// STREAM WORKSHOP VIDEO
const streamWorkshopVideo = async (req, res) => {
    const { id } = req.params;
    try {
        const metaRes = await query('SELECT total_size, mime_type FROM workshop_videos WHERE workshop_id = $1 LIMIT 1', [id]);
        if (!metaRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Video not found.' });
        }
        const { total_size, mime_type } = metaRes.rows[0];
        const totalSize = parseInt(total_size, 10);

        const range = req.headers.range;
        if (!range) {
            res.writeHead(200, {
                'Content-Length': totalSize,
                'Content-Type': mime_type || 'video/mp4'
            });
            const chunksRes = await query('SELECT data FROM workshop_videos WHERE workshop_id = $1 ORDER BY chunk_index ASC', [id]);
            for (const row of chunksRes.rows) {
                res.write(row.data);
            }
            res.end();
            return;
        }

        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : totalSize - 1;

        if (start >= totalSize || end >= totalSize) {
            res.writeHead(416, { 'Content-Range': `bytes */${totalSize}` });
            return res.end();
        }

        const chunksize = (end - start) + 1;
        res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${totalSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': mime_type || 'video/mp4'
        });

        const queryStr = `
            SELECT chunk_index, chunk_size, byte_offset, data 
            FROM workshop_videos 
            WHERE workshop_id = $1 
              AND byte_offset <= $2 
              AND (byte_offset + chunk_size) > $3 
            ORDER BY chunk_index ASC
        `;
        const overlappingRes = await query(queryStr, [id, end, start]);

        for (const row of overlappingRes.rows) {
            const offset = parseInt(row.byte_offset, 10);
            const size = parseInt(row.chunk_size, 10);
            const buffer = row.data;

            const chunkStart = Math.max(start, offset);
            const chunkEnd = Math.min(end, offset + size - 1);

            const sliceStart = chunkStart - offset;
            const sliceEnd = chunkEnd - offset + 1;

            res.write(buffer.slice(sliceStart, sliceEnd));
        }
        res.end();
    } catch (err) {
        console.error('streamWorkshopVideo error:', err);
        return res.status(500).json({ success: false, message: 'Server error streaming video.' });
    }
};

module.exports = {
    getAllWorkshops, getWorkshopById, createWorkshop,
    updateWorkshop, deleteWorkshop,
    updateWorkshopStaff, completeWorkshopAllocation,
    enrollUserInWorkshop, getWorkshopAttendees,
    updateAttendeeAttendance, exportWorkshopAttendees,
    deleteWorkshopAttendee, uploadVideoChunk, streamWorkshopVideo,
    autoUpdateWorkshopStatuses
};