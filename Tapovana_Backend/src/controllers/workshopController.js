const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendAllocationEmail, sendWorkshopEnrollmentEmail, sendWorkshopRemovalEmail, sendWorkshopScheduledEmail, sendWorkshopOngoingEmail, sendWorkshopDeallocationEmail, sendWorkshopCompletedEmail, sendWorkshopAllocationNotificationEmail, sendWorkshopCompletionCertificateEmail } = require('../services/emailService');
const { generateCertificatePDF } = require('../utils/pdfGenerator');
const { checkStaffAllocationConflict, syncStaffMemberStatus } = require('../utils/conflictChecker');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (process.env.NODE_ENV === 'production') return; // Vercel filesystem is read-only
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// Helper: Validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// HELPERS: 24-hour Clock and Timezone Parsing
const formatTime24 = (timeStr) => {
    if (!timeStr) return "00:00";
    const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!match) {
        const parts = timeStr.split(':');
        const h = parseInt(parts[0], 10) || 0;
        const m = parseInt(parts[1], 10) || 0;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    }
    let hours = parseInt(match[1], 10);
    const mins = parseInt(match[2], 10);
    const ampm = match[3] ? match[3].toUpperCase() : null;
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
};

const parseDateTime = (dateStr, timeStr) => {
    if (!dateStr) return null;
    const parts = dateStr.split('T')[0].split('-');
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);

    const formattedTime = formatTime24(timeStr);
    const [hours, minutes] = formattedTime.split(':').map(Number);

    return new Date(year, month - 1, day, hours, minutes, 0, 0);
};

const getCapitalizedStatus = (status) => {
    if (!status) return 'Upcoming';
    const s = status.trim().toLowerCase();
    if (s === 'upcoming') return 'Upcoming';
    if (s === 'live' || s === 'ongoing') return 'Live';
    if (s === 'completed') return 'Completed';
    if (s === 'cancelled') return 'Cancelled';
    return 'Upcoming';
};

// HELPER: Dynamic Status Transition & Notifications
function getStatus(wsDate, wsTime, wsDuration, start_time, end_time) {
    const now = new Date();

    let startTime, endTime;
    if (start_time && end_time) {
        startTime = new Date(start_time);
        endTime = new Date(end_time);
    } else {
        const parsed = parseDateTime(wsDate, wsTime);
        if (!parsed) return 'Upcoming';
        startTime = parsed;
        const durationMins = parseInt(wsDuration, 10) || 60;
        endTime = new Date(startTime.getTime() + durationMins * 60000);
    }

    if (now < startTime) {
        return 'Upcoming';
    } else if (now >= startTime && now < endTime) {
        return 'Live';
    } else {
        return 'Completed';
    }
}

async function validateWorkshopActions(workshopId) {
    const wsRes = await query('SELECT date, time, duration, status, start_time, end_time FROM workshops WHERE id = $1', [workshopId]);
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

    const calculatedStatus = getStatus(dateStr, w.time, w.duration, w.start_time, w.end_time);
    if (calculatedStatus === 'Live') {
        throw new Error('This workshop is currently live. Staff assignment and enrollment are disabled.');
    }
    if (calculatedStatus === 'Completed') {
        throw new Error('This workshop is completed. Staff assignment and enrollment are disabled.');
    }
    if (w.status === 'Cancelled' || w.status === 'cancelled') {
        throw new Error('This workshop has been cancelled. Staff assignment and enrollment are disabled.');
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
    if (!isValidUUID(staffId)) {
        console.log(`Skipping allocate for invalid staff_id: ${staffId}`);
        return;
    }

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
            sendWorkshopAllocationNotificationEmail({
                to: s.email,
                staffName: s.first_name,
                workshopTitle: workshop.title,
                date: workshop.date,
                time: workshop.time
            }).then(() => {
                console.log('Allocation email sent successfully to ' + s.email);
            }).catch((err) => {
                console.error('Allocation email send failed: ' + err.message);
            });
        }
    } catch (emailErr) {
        console.error('Email error: ' + emailErr.message);
    }
};

// Helper: Deallocate staff
const deallocateStaffMember = async (staffId) => {
    if (!isValidUUID(staffId)) {
        console.log(`Skipping deallocate for invalid staff_id: ${staffId}`);
        return;
    }
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

        const isCancelled = workshop.status === 'Cancelled' || workshop.status === 'cancelled';
        if (!isCancelled) {
            const allocationStatus = workshop.status;
            const staffIds = workshop.assigned_staff_ids || [];
            const validStaffIds = staffIds.filter(id => isValidUUID(id));

            for (const staffId of validStaffIds) {
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
        const allStaffIds = Array.from(new Set([...oldStaffIds, ...newStaffIds])).filter(id => isValidUUID(id));

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
    const { title, category, instructor, date, time, duration, capacity, price, status, description, image_url, video_url, assigned_staff_ids, customer_email } = req.body;

    if (!title) {
        return res.status(400).json({ success: false, message: 'Workshop title is required.' });
    }

    if (!assigned_staff_ids || !Array.isArray(assigned_staff_ids) || assigned_staff_ids.length === 0) {
        return res.status(400).json({ success: false, message: 'Instructor selection is required.' });
    }

    // Verify time format (AM/PM or HH:MM)
    if (time) {
        const timeRegex = /^([0-9]|0[0-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
        const timeRegex24 = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time) && !timeRegex24.test(time)) {
            return res.status(400).json({ success: false, message: 'Invalid time format. Must be HH:MM AM/PM or HH:MM.' });
        }
    }

    // Verify price
    if (price !== undefined && price !== null && price !== "") {
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a valid positive number.' });
        }
    }

    // Verify duration
    if (duration !== undefined && duration !== null && duration !== "") {
        const parsedDuration = Number(duration);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
            return res.status(400).json({ success: false, message: 'Duration must be a positive integer.' });
        }
    }

    // Verify capacity
    if (capacity !== undefined && capacity !== null && capacity !== "") {
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
            return res.status(400).json({ success: false, message: 'Capacity must be a positive integer.' });
        }
    }

    // Verify category whitelist
    const allowedCategories = ['Yoga', 'Meditation', 'Nutrition', 'Ayurveda', 'Holistic'];
    if (category && !allowedCategories.includes(category)) {
        return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${allowedCategories.join(', ')}` });
    }

    // Verify customer_email
    if (customer_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer_email.trim())) {
            return res.status(400).json({ success: false, message: 'Invalid customer email address format.' });
        }
    }

    const durationMins = parseInt(duration, 10) || 60;
    let startTime = null;
    let endTime = null;

    if (date) {
        startTime = parseDateTime(date, time);
        if (startTime) {
            const now = new Date();
            if (startTime < now) {
                return res.status(400).json({ success: false, message: "Cannot schedule a workshop at a past date or time." });
            }
            endTime = new Date(startTime.getTime() + durationMins * 60000);
        }
    }

    try {
        const savedImageUrl = handleWorkshopImage(image_url);
        const savedVideoUrl = handleWorkshopVideo(video_url);
        const staffIds = assigned_staff_ids || [];

        // Validate that assigned staff exist, are active, and are doctors or therapists
        for (const staffId of staffIds) {
            const staffCheck = await query(
                `SELECT tm.id, tm.status, r.name AS role_name 
                 FROM team_members tm
                 JOIN roles r ON r.id = tm.role_id
                 WHERE tm.id = $1`,
                [staffId]
            );
            if (!staffCheck.rows.length) {
                return res.status(400).json({ success: false, message: `Specialist staff ID ${staffId} does not exist.` });
            }
            const s = staffCheck.rows[0];
            if (s.status !== 'active') {
                return res.status(400).json({ success: false, message: `Specialist staff ID ${staffId} is currently inactive.` });
            }
            const roleNameLower = String(s.role_name || '').toLowerCase();
            if (roleNameLower !== 'doctor' && roleNameLower !== 'therapist') {
                return res.status(400).json({ success: false, message: `Staff member must be a DOCTOR or THERAPIST to be assigned.` });
            }
        }

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
                durationMins: durationMins,
                type: 'workshop'
            });

            if (conflictCheck.conflict) {
                return res.status(400).json({
                    success: false,
                    message: "Conflict: Staff already allocated at this time or daily limit exceeded."
                });
            }
        }

        const initialStatus = status ? getCapitalizedStatus(status) : getStatus(date, time, durationMins, startTime, endTime);

        const result = await query(
            `INSERT INTO workshops (
                title, category, instructor, date, time, duration, capacity, enrolled, price, 
                status, description, image_url, video_url, assigned_staff_ids, created_by, 
                allocation_count, instructor_id, start_time, end_time, customer_email
             ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20) RETURNING *`,
            [
                title.trim(), category || null, instructor || null, date || null, formatTime24(time),
                durationMins, 10000, 0, price || null,
                initialStatus, description || null,
                savedImageUrl, savedVideoUrl, JSON.stringify(staffIds), req.user?.id || null,
                staffIds.length > 0 ? 1 : 0,
                staffIds.length > 0 ? staffIds[0] : null,
                startTime ? startTime.toISOString() : null,
                endTime ? endTime.toISOString() : null,
                customer_email || null
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
    const { title, category, instructor, date, time, duration, capacity, price, status, description, image_url, video_url, assigned_staff_ids, customer_email } = req.body;

    // Verify time format if updated
    if (time !== undefined && time !== null) {
        const timeRegex = /^([0-9]|0[0-9]|1[0-2]):[0-5][0-9]\s*(AM|PM)$/i;
        const timeRegex24 = /^([01][0-9]|2[0-3]):[0-5][0-9]$/;
        if (!timeRegex.test(time) && !timeRegex24.test(time)) {
            return res.status(400).json({ success: false, message: 'Invalid time format. Must be HH:MM AM/PM or HH:MM.' });
        }
    }

    // Verify price
    if (price !== undefined && price !== null && price !== "") {
        const parsedPrice = Number(price);
        if (isNaN(parsedPrice) || parsedPrice < 0) {
            return res.status(400).json({ success: false, message: 'Price must be a valid positive number.' });
        }
    }

    // Verify duration
    if (duration !== undefined && duration !== null && duration !== "") {
        const parsedDuration = Number(duration);
        if (isNaN(parsedDuration) || parsedDuration <= 0) {
            return res.status(400).json({ success: false, message: 'Duration must be a positive integer.' });
        }
    }

    // Verify capacity
    if (capacity !== undefined && capacity !== null && capacity !== "") {
        const parsedCapacity = Number(capacity);
        if (isNaN(parsedCapacity) || parsedCapacity <= 0) {
            return res.status(400).json({ success: false, message: 'Capacity must be a positive integer.' });
        }
    }

    // Verify category whitelist
    const allowedCategories = ['Yoga', 'Meditation', 'Nutrition', 'Ayurveda', 'Holistic'];
    if (category !== undefined && category !== null && !allowedCategories.includes(category)) {
        return res.status(400).json({ success: false, message: `Invalid category. Must be one of: ${allowedCategories.join(', ')}` });
    }

    // Verify customer_email
    if (customer_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(customer_email.trim())) {
            return res.status(400).json({ success: false, message: 'Invalid customer email address format.' });
        }
    }

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

        // Validate that assigned staff exist, are active, and are doctors or therapists
        if (assigned_staff_ids !== undefined) {
            if (!Array.isArray(assigned_staff_ids) || assigned_staff_ids.length === 0) {
                return res.status(400).json({ success: false, message: 'Instructor selection is required.' });
            }
            for (const staffId of assigned_staff_ids) {
                const staffCheck = await query(
                    `SELECT tm.id, tm.status, r.name AS role_name 
                     FROM team_members tm
                     JOIN roles r ON r.id = tm.role_id
                     WHERE tm.id = $1`,
                    [staffId]
                );
                if (!staffCheck.rows.length) {
                    return res.status(400).json({ success: false, message: `Specialist staff ID ${staffId} does not exist.` });
                }
                const s = staffCheck.rows[0];
                if (s.status !== 'active') {
                    return res.status(400).json({ success: false, message: `Specialist staff ID ${staffId} is currently inactive.` });
                }
                const roleNameLower = String(s.role_name || '').toLowerCase();
                if (roleNameLower !== 'doctor' && roleNameLower !== 'therapist') {
                    return res.status(400).json({ success: false, message: `Staff member must be a DOCTOR or THERAPIST to be assigned.` });
                }
            }
        }

        // Recalculate start_time and end_time if date/time/duration are updated
        let targetStartTime = existing.start_time;
        let targetEndTime = existing.end_time;
        if (date !== undefined || time !== undefined || duration !== undefined) {
            const parsedStart = parseDateTime(targetDate, targetTime);
            if (parsedStart) {
                targetStartTime = parsedStart.toISOString();
                const durationMins = parseInt(targetDuration, 10) || 60;
                targetEndTime = new Date(parsedStart.getTime() + durationMins * 60000).toISOString();
            }
        }

        // Validate date is in the future
        if ((date !== undefined || time !== undefined) && targetStartTime) {
            const now = new Date();
            if (new Date(targetStartTime) < now) {
                return res.status(400).json({ success: false, message: "Cannot schedule a workshop at a past date or time." });
            }
        }

        const now = new Date();
        const currentStatus = getStatus(
            existing.date,
            existing.time,
            existing.duration,
            existing.start_time,
            existing.end_time
        );

        // Prevent editing if status is Live/Completed (except for the status update itself)
        if (currentStatus === 'Live' || currentStatus === 'Completed') {
            const isUpdatingOtherFields = (
                title !== undefined || category !== undefined || instructor !== undefined ||
                date !== undefined || time !== undefined || duration !== undefined ||
                capacity !== undefined || price !== undefined || description !== undefined ||
                image_url !== undefined || video_url !== undefined || assigned_staff_ids !== undefined ||
                customer_email !== undefined
            );
            if (isUpdatingOtherFields) {
                return res.status(400).json({ success: false, message: "Cannot edit a workshop that is Live or Completed." });
            }
        }

        // Prevent editing if status is Cancelled (unless reactivating to Upcoming)
        const dbStatus = getCapitalizedStatus(existing.status);
        if (dbStatus === 'Cancelled') {
            const targetStatus = status !== undefined ? getCapitalizedStatus(status) : 'Cancelled';
            if (targetStatus !== 'Upcoming') {
                return res.status(400).json({ success: false, message: "Cannot edit a cancelled workshop unless reactivating its status to Upcoming." });
            }
        }

        // Status transition rules
        if (status !== undefined) {
            const targetStatus = getCapitalizedStatus(status);
            if (targetStatus === 'Cancelled') {
                if (currentStatus !== 'Upcoming') {
                    return res.status(400).json({ success: false, message: "Cannot cancel a workshop unless its status is Upcoming." });
                }
            }
            if (targetStatus === 'Completed') {
                const endTime = existing.end_time ? new Date(existing.end_time) : null;
                if (endTime) {
                    if (now < endTime) {
                        return res.status(400).json({ success: false, message: "Cannot mark a workshop as Completed until after its end time has passed." });
                    }
                }
            }
        }

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
        if (time !== undefined) { fields.push('time = $' + idx++); values.push(formatTime24(time)); }
        if (duration !== undefined) { fields.push('duration = $' + idx++); values.push(duration || null); }
        if (capacity !== undefined) { fields.push('capacity = $' + idx++); values.push(capacity || null); }
        if (price !== undefined) { fields.push('price = $' + idx++); values.push(price || null); }
        if (status !== undefined) { fields.push('status = $' + idx++); values.push(getCapitalizedStatus(status)); }
        if (description !== undefined) { fields.push('description = $' + idx++); values.push(description || null); }
        if (savedImageUrl !== undefined) { fields.push('image_url = $' + idx++); values.push(savedImageUrl); }
        if (savedVideoUrl !== undefined) { fields.push('video_url = $' + idx++); values.push(savedVideoUrl); }
        if (customer_email !== undefined) { fields.push('customer_email = $' + idx++); values.push(customer_email || null); }

        if (date !== undefined || time !== undefined || duration !== undefined) {
            fields.push('start_time = $' + idx++);
            values.push(targetStartTime);
            fields.push('end_time = $' + idx++);
            values.push(targetEndTime);
        }

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

            const allocData = {
                ...existing,
                title: title || existing.title,
                date: date || existing.date,
                time: time || existing.time
            };
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

        if (status !== undefined && getCapitalizedStatus(status) === 'Completed') {
            // Run status/certificates check immediately
            autoUpdateWorkshopStatuses().catch(err => console.error("Error in on-demand workshop completion status update:", err));
        }

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

        const calculatedStatus = getStatus(dateStr, workshop.time, workshop.duration, workshop.start_time, workshop.end_time);
        if (calculatedStatus === 'Live') {
            return res.status(400).json({ success: false, message: "Cannot delete a live/ongoing workshop." });
        }
        if (calculatedStatus === 'Completed') {
            return res.status(400).json({ success: false, message: "Cannot delete a completed workshop. Only upcoming workshops can be deleted." });
        }

        if (workshop.enrolled > 0) {
            return res.status(400).json({
                success: false,
                message: "Cannot delete a workshop that has enrolled attendees. Please cancel the workshop or unenroll attendees first to prevent data loss."
            });
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
        let workshopId = null;
        // Only try to update workshop if id is a valid UUID
        if (isValidUUID(req.params.id)) {
            const wsResult = await query('SELECT * FROM workshops WHERE id = $1', [req.params.id]);
            if (wsResult.rows.length) {
                const workshop = wsResult.rows[0];
                workshopId = workshop.id;
                let staffIds = workshop.assigned_staff_ids || [];
                staffIds = staffIds.filter(id => id !== staff_id);

                await query('UPDATE workshops SET assigned_staff_ids = $1 WHERE id = $2', [JSON.stringify(staffIds), req.params.id]);
            }
        }
        
        // Only try to deallocate if staff_id is valid UUID
        if (isValidUUID(staff_id)) {
            await deallocateStaffMember(staff_id);
        } else {
            console.log(`Skipping deallocate for invalid staff_id: ${staff_id}`);
        }

        // Sync workshop allocations if we have a valid workshopId
        if (workshopId) {
            await syncWorkshopAllocations(workshopId);
        }

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

        // If workshop is already completed, reset completed_notified to false so the background scheduler generates certificate for the new attendee
        if (workshop.status === 'Completed' || workshop.status === 'completed') {
            await query('UPDATE workshops SET completed_notified = FALSE WHERE id = $1', [id]);
        }

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

        // If attendance status changes to 'attended' and the workshop is already Completed, reset completed_notified to false so they get their certificate
        if (status === 'attended') {
            const wsRes = await query('SELECT status FROM workshops WHERE id = $1', [id]);
            if (wsRes.rows.length && (wsRes.rows[0].status === 'Completed' || wsRes.rows[0].status === 'completed')) {
                await query('UPDATE workshops SET completed_notified = FALSE WHERE id = $1', [id]);
            }
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
            SELECT id, title, date, time, duration, status, assigned_staff_ids, start_time, end_time, upcoming_notified, ongoing_notified, completed_notified 
            FROM workshops 
            WHERE status NOT IN ('Completed', 'completed') OR (status IN ('Completed', 'completed') AND completed_notified = FALSE)
        `);
        for (const w of res.rows) {
            let dateStr = w.date;
            if (w.date instanceof Date) {
                const year = w.date.getFullYear();
                const month = String(w.date.getMonth() + 1).padStart(2, '0');
                const day = String(w.date.getDate()).padStart(2, '0');
                dateStr = `${year}-${month}-${day}`;
            }

            let newStatus = getStatus(dateStr, w.time, w.duration, w.start_time, w.end_time);

            // Respect manual overrides or terminal statuses
            if (w.status === 'Completed' || w.status === 'completed') {
                newStatus = 'Completed';
            } else if (w.status === 'Cancelled' || w.status === 'cancelled') {
                newStatus = 'Cancelled';
            } else if (w.status === 'Live' && newStatus === 'Upcoming') {
                // If already marked live manually, do not downgrade to upcoming
                newStatus = 'Live';
            }

            let upNotified = w.upcoming_notified;
            let onNotified = w.ongoing_notified;
            let compNotified = w.completed_notified || false;

            // 1. Send scheduled notifications if Upcoming and not notified
            if (newStatus === 'Upcoming' && !upNotified) {
                // Send to attendees
                const attendeesRes = await query('SELECT email, name FROM attendees WHERE workshop_id = $1', [w.id]);
                for (const att of attendeesRes.rows) {
                    sendWorkshopScheduledEmail({
                        to: att.email,
                        staffOrParticipantName: att.name,
                        workshopTitle: w.title,
                        date: dateStr,
                        time: w.time
                    }).catch(e => console.error('Upcoming email (attendee) failed:', e.message));
                }

                // Send to staff
                const staffIds = w.assigned_staff_ids || [];
                const validStaffIds = staffIds.filter(id => isValidUUID(id));
                for (const staffId of validStaffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        sendWorkshopScheduledEmail({
                            to: s.email,
                            staffOrParticipantName: `${s.first_name} ${s.last_name}`.trim(),
                            workshopTitle: w.title,
                            date: dateStr,
                            time: w.time
                        }).catch(e => console.error('Upcoming email (staff) failed:', e.message));
                    }
                }
                upNotified = true;
            }

            // 2. Send live/ongoing notifications if Live and not notified
            if (newStatus === 'Live' && !onNotified) {
                const attendeesRes = await query('SELECT email, name FROM attendees WHERE workshop_id = $1', [w.id]);
                for (const att of attendeesRes.rows) {
                    sendWorkshopOngoingEmail({
                        to: att.email,
                        staffOrParticipantName: att.name,
                        workshopTitle: w.title
                    }).catch(e => console.error('Live email (attendee) failed:', e.message));
                }

                const staffIds = w.assigned_staff_ids || [];
                const validStaffIds = staffIds.filter(id => isValidUUID(id));
                for (const staffId of validStaffIds) {
                    const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                    if (staffRes.rows.length) {
                        const s = staffRes.rows[0];
                        sendWorkshopOngoingEmail({
                            to: s.email,
                            staffOrParticipantName: `${s.first_name} ${s.last_name}`.trim(),
                            workshopTitle: w.title
                        }).catch(e => console.error('Live email (staff) failed:', e.message));
                    }
                }
                onNotified = true;
            }

            // 3. Send completed notifications if Newly/Already Completed
            if (newStatus === 'Completed') {
                const attendeesRes = await query("SELECT id, email, name FROM attendees WHERE workshop_id = $1 AND status != 'absent'", [w.id]);
                
                // Determine if this is the initial transition to Completed status
                const isInitialCompletion = (w.status !== 'Completed' && w.status !== 'completed');

                // Send general completion email to staff only during the initial transition
                if (isInitialCompletion) {
                    const staffIds = w.assigned_staff_ids || [];
                    const validStaffIds = staffIds.filter(id => isValidUUID(id));
                    for (const staffId of validStaffIds) {
                        const staffRes = await query('SELECT email, first_name, last_name FROM team_members WHERE id = $1', [staffId]);
                        if (staffRes.rows.length) {
                            const s = staffRes.rows[0];
                            sendWorkshopCompletedEmail({
                                to: s.email,
                                staffOrParticipantName: `${s.first_name} ${s.last_name}`.trim(),
                                workshopTitle: w.title,
                                date: dateStr,
                                time: w.time
                            }).catch(e => console.error('Completed email (staff) failed:', e.message));
                        }
                    }
                }

                // Process attendees: generate certificate and send emails for anyone who doesn't have a certificate yet
                const port = process.env.PORT || 5000;
                const defaultUrl = process.env.NODE_ENV === 'production' ? 'https://tapovana.onrender.com' : `http://localhost:${port}`;
                const backendUrl = process.env.BACKEND_URL || process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || defaultUrl;
                for (const att of attendeesRes.rows) {
                    try {
                        const certCheck = await query('SELECT certificate_id, certificate_url FROM certificates WHERE participant_id = $1 AND workshop_id = $2', [att.id, w.id]);
                        
                        if (certCheck.rows.length === 0) {
                            const certId = uuidv4();
                            const certUrl = `${backendUrl}/api/certificates/download/${certId}`;

                            const compDateObj = new Date(dateStr);
                            const completionDateStr = compDateObj.toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            });

                            // Generate and save certificate PDF persistently to disk
                            const pdfBuffer = await generateCertificatePDF(att.name, w.title, completionDateStr);
                            const certsDir = path.join(process.cwd(), 'certificates');
                            if (!fs.existsSync(certsDir)) {
                                fs.mkdirSync(certsDir, { recursive: true });
                            }
                            const filePath = path.join(certsDir, `${certId}.pdf`);
                            fs.writeFileSync(filePath, pdfBuffer);
                            
                            await query(
                                `INSERT INTO certificates (certificate_id, participant_id, workshop_id, certificate_url, issued_date)
                                 VALUES ($1, $2, $3, $4, NOW())`,
                                [certId, att.id, w.id, certUrl]
                            );

                            await sendWorkshopCompletionCertificateEmail({
                                to: att.email,
                                participantName: att.name,
                                workshopTitle: w.title,
                                completionDate: completionDateStr,
                                downloadUrl: certUrl,
                                certId: certId
                            });
                            console.log(`Certificate email sent to attendee: ${att.email} for workshop: ${w.title}`);
                        }
                    } catch (certErr) {
                        console.error(`Error generating/sending certificate for attendee ${att.email}:`, certErr.message);
                    }
                }
                compNotified = true;
            }

            // Write audit log if status changed
            if (newStatus !== w.status) {
                try {
                    await query(
                        `INSERT INTO workshop_audit_log (workshop_id, old_status, new_status, changed_by, status_change)
                         VALUES ($1, $2, $3, $4, $5)`,
                        [w.id, w.status, newStatus, 'system', `${w.status} -> ${newStatus}`]
                    );
                } catch (auditErr) {
                    console.error('Failed to write workshop audit log:', auditErr.message);
                }
            }

            if (newStatus !== w.status || upNotified !== w.upcoming_notified || onNotified !== w.ongoing_notified || compNotified !== (w.completed_notified || false)) {
                await query(
                    `UPDATE workshops 
                     SET status = $1, upcoming_notified = $2, ongoing_notified = $3, completed_notified = $4
                     WHERE id = $5`,
                    [newStatus, upNotified, onNotified, compNotified, w.id]
                );
                // Sync status change to allocations table immediately
                await syncWorkshopAllocations(w.id);
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

// DOWNLOAD CERTIFICATE PDF
const downloadCertificate = async (req, res) => {
    let id = req.params.id;
    if (id && id.endsWith('.pdf')) {
        id = id.slice(0, -4);
    }
    try {
        const queryBase = `
            SELECT c.certificate_id, c.issued_date, 
                   a.name AS participant_name, 
                   w.title AS workshop_title, w.date AS workshop_date
            FROM certificates c
            JOIN attendees a ON a.id = c.participant_id
            JOIN workshops w ON w.id = c.workshop_id
        `;
        let certRes;
        if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
            certRes = await query(queryBase + ' WHERE c.certificate_id = $1 OR c.participant_id = $1', [id]);
        } else if (/^\d+$/.test(id)) {
            certRes = await query(queryBase + ' WHERE c.participant_id = $1', [parseInt(id, 10)]);
        } else {
            return res.status(404).json({ success: false, message: 'Invalid certificate identifier format.' });
        }

        if (!certRes.rows.length) {
            if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)) {
                // Check if the id is actually an attendee ID of a completed workshop
                const attendeeRes = await query(`
                    SELECT a.id, a.name, a.email, w.id AS workshop_id, w.title AS workshop_title, w.date AS workshop_date, w.status AS workshop_status
                    FROM attendees a
                    JOIN workshops w ON w.id = a.workshop_id
                    WHERE a.id = $1 AND (w.status = 'Completed' OR w.status = 'completed')
                `, [id]);
                
                if (attendeeRes.rows.length) {
                    const att = attendeeRes.rows[0];
                    const certId = uuidv4();
                    const port = process.env.PORT || 5000;
                    const defaultUrl = process.env.NODE_ENV === 'production' ? 'https://tapovana.onrender.com' : `http://localhost:${port}`;
                    const backendUrl = process.env.BACKEND_URL || process.env.SELF_URL || process.env.RENDER_EXTERNAL_URL || defaultUrl;
                    const certUrl = `${backendUrl}/api/certificates/download/${certId}`;
                    
                    let dateStr = att.workshop_date;
                    if (att.workshop_date instanceof Date) {
                        const year = att.workshop_date.getFullYear();
                        const month = String(att.workshop_date.getMonth() + 1).padStart(2, '0');
                        const day = String(att.workshop_date.getDate()).padStart(2, '0');
                        dateStr = `${year}-${month}-${day}`;
                    }
                    const compDateObj = new Date(dateStr);
                    const completionDateStr = compDateObj.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    });

                    const pdfBuffer = await generateCertificatePDF(att.name, att.workshop_title, completionDateStr);
                    const certsDir = path.join(process.cwd(), 'certificates');
                    if (!fs.existsSync(certsDir)) {
                        fs.mkdirSync(certsDir, { recursive: true });
                    }
                    const filePath = path.join(certsDir, `${certId}.pdf`);
                    fs.writeFileSync(filePath, pdfBuffer);
                    
                    await query(
                        `INSERT INTO certificates (certificate_id, participant_id, workshop_id, certificate_url, issued_date)
                         VALUES ($1, $2, $3, $4, NOW())`,
                        [certId, att.id, att.workshop_id, certUrl]
                    );
                    
                    certRes = await query(queryBase + ' WHERE c.certificate_id = $1', [certId]);
                }
            }
        }

        if (!certRes.rows.length) {
            return res.status(404).json({ success: false, message: 'Certificate not found.' });
        }

        const cert = certRes.rows[0];
        const certId = cert.certificate_id;

        const certsDir = path.join(process.cwd(), 'certificates');
        let filePath = path.join(certsDir, `${certId}.pdf`);

        if (!fs.existsSync(filePath)) {
            const oldFilePath = path.join(__dirname, '../../uploads/certificates', `${certId}.pdf`);
            if (fs.existsSync(oldFilePath)) {
                filePath = oldFilePath;
            } else {
                // Fallback for older records: generate and save it
                let dateStr = cert.workshop_date;
                const completionDate = dateStr ? new Date(dateStr) : new Date(cert.issued_date);
                const formattedDate = completionDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
                const pdfBuffer = await generateCertificatePDF(cert.participant_name, cert.workshop_title, formattedDate);

                if (!fs.existsSync(certsDir)) {
                    fs.mkdirSync(certsDir, { recursive: true });
                }
                fs.writeFileSync(filePath, pdfBuffer);
            }
        }

        res.setHeader("Content-Type", "application/octet-stream");
        res.setHeader("Content-Disposition", "attachment; filename=certificate.pdf");

        const stream = fs.createReadStream(filePath);
        stream.on('error', (streamErr) => {
            console.error('downloadCertificate stream error:', streamErr);
            if (!res.headersSent) {
                res.status(500).json({ success: false, message: 'Server error downloading certificate.' });
            }
        });
        return stream.pipe(res);
    } catch (err) {
        console.error('downloadCertificate error:', err);
        return res.status(500).json({ success: false, message: 'Server error downloading certificate.' });
    }
};

module.exports = {
    getAllWorkshops, getWorkshopById, createWorkshop,
    updateWorkshop, deleteWorkshop,
    updateWorkshopStaff, completeWorkshopAllocation,
    enrollUserInWorkshop, getWorkshopAttendees,
    updateAttendeeAttendance, exportWorkshopAttendees,
    deleteWorkshopAttendee, uploadVideoChunk, streamWorkshopVideo,
    autoUpdateWorkshopStatuses, downloadCertificate
};