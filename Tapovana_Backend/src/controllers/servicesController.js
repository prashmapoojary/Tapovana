const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');
const { sendAllocationEmail } = require('../services/emailService');
const https = require('https');

const pexelsCache = new Map();

const getPexelsFallbackImage = async (queryStr) => {
    if (!queryStr) return null;
    const cleanQuery = queryStr.trim().toLowerCase();
    if (pexelsCache.has(cleanQuery)) {
        return pexelsCache.get(cleanQuery);
    }
    const pexelsKey = process.env.PEXELS_KEY || process.env.PEXELS_API_KEY || 'ayDlUYgPQDoXz7uZVuztXRKsNILvAitgDiUnKrWR1nwk0VBu2NbLE4v9';
    if (!pexelsKey) return null;
    
    const image = await new Promise((resolve) => {
        const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(cleanQuery)}&per_page=1`;
        const req = https.get(url, {
            headers: { 'Authorization': pexelsKey },
            timeout: 3000
        }, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    if (result.photos && result.photos.length > 0) {
                        resolve(result.photos[0].src.large);
                    } else {
                        resolve(null);
                    }
                } catch {
                    resolve(null);
                }
            });
        });
        req.on('error', () => resolve(null));
    });
    
    if (image) {
        pexelsCache.set(cleanQuery, image);
    }
    return image;
};


const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// Helper: handle image save (base64 or URL)
const handleServiceImage = (imageData) => {
    if (!imageData || typeof imageData !== 'string') return null;

    const matches = imageData.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,([\s\S]+)$/);
    if (matches && matches.length === 4) {
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

    // If it's already an http URL or relative path, keep as-is
    if (/^https?:\/\//.test(imageData)) {
        return imageData;
    }
    if (imageData?.startsWith('/uploads/')) {
        return imageData;
    }
    return imageData;
};

const ensureArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string') {
        try {
            const parsed = JSON.parse(val);
            if (Array.isArray(parsed)) return parsed;
            if (parsed) return [parsed];
        } catch {
            return val.split(',').map(s => s.trim()).filter(Boolean);
        }
    }
    if (val !== undefined && val !== null && val !== '') return [val];
    return [];
};

// Helper: Make image URL absolute for mobile clients
const getFullImageUrl = (req, imageUrl) => {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;
    if (/^https?:\/\//.test(imageUrl) || imageUrl.startsWith('data:')) {
        return imageUrl;
    }
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    return `${protocol}://${host}${imageUrl.startsWith('/') ? '' : '/'}${imageUrl}`;
};


// Helper: Send email notification
const sendEmailForAllocation = async (staffId, service) => {
    try {
        const staffRes = await query('SELECT first_name, email FROM team_members WHERE id = $1', [staffId]);
        if (staffRes.rows.length) {
            const s = staffRes.rows[0];
            console.log('Attempting to send email to: ' + s.email + ' for service: ' + service.name);

            sendAllocationEmail({
                to: s.email,
                firstName: s.first_name,
                programName: service.name,
                programType: 'Service',
                startDate: new Date().toISOString(),
                endDate: null
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

// Helper: Validate UUID
const isValidUUID = (id) => {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
};

// Helper: Allocate a single staff member
const allocateStaffMember = async (staffId, service) => {
    if (!isValidUUID(staffId)) {
        console.warn('allocateStaffMember: skipping invalid UUID:', staffId);
        return;
    }
    const allocationDetails = {
        id: service.id,
        type: 'service',
        sessionTitle: service.name,
        sessionId: service.id,
        startDate: new Date().toISOString(),
        endDate: null
    };

    try {
        await query(
            'UPDATE team_members SET availability_status = $1, allocation_details = $2::jsonb WHERE id = $3 AND status = $4',
            ['Allocated', JSON.stringify(allocationDetails), staffId, 'active']
        );

        // Send email notification (fire and forget - don't block)
        if (service.status !== 'DRAFT') {
            await sendEmailForAllocation(staffId, service);
        }
    } catch (err) {
        console.error('allocateStaffMember error:', err);
    }
};

// Helper: Deallocate a single staff member
const deallocateStaffMember = async (staffId) => {
    if (!isValidUUID(staffId)) {
        console.warn('deallocateStaffMember: skipping invalid UUID:', staffId);
        return;
    }
    try {
        await query(
            'UPDATE team_members SET availability_status = $1, allocation_details = NULL WHERE id = $2 AND availability_status = $3',
            ['Available', staffId, 'Allocated']
        );
    } catch (err) {
        console.error('deallocateStaffMember error:', err);
    }
};

// GET ALL SERVICES
const getAllServices = async (req, res) => {
    try {
        const { status, category, page = 1, limit = 50 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (status) { conditions.push('s.status = $' + idx++); values.push(status.toUpperCase()); }
        if (category) { conditions.push('s.category = $' + idx++); values.push(category); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await query('SELECT COUNT(*) FROM services s ' + whereClause, values);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            'SELECT s.*, tm.first_name AS created_by_first_name, tm.last_name AS created_by_last_name ' +
            'FROM services s LEFT JOIN team_members tm ON tm.id = s.created_by ' + whereClause + ' ORDER BY s.created_at DESC LIMIT $' + idx + ' OFFSET $' + (idx + 1),
            [...values, parseInt(limit), offset]
        );

        const formattedServices = [];
        for (const row of result.rows) {
            let image_url = row.image_url;
            if (!image_url) {
                image_url = await getPexelsFallbackImage(row.name);
            }
            formattedServices.push({
                ...row,
                image_url: getFullImageUrl(req, image_url)
            });
        }

        return res.json({
            success: true,
            services: formattedServices,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
        });
    } catch (err) {
        console.error('getAllServices error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET SINGLE SERVICE
const getServiceById = async (req, res) => {
    if (!isValidUUID(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Service not found.' });
    }
    try {
        const result = await query(
            'SELECT s.*, tm.first_name AS created_by_first_name, tm.last_name AS created_by_last_name ' +
            'FROM services s LEFT JOIN team_members tm ON tm.id = s.created_by WHERE s.id = $1',
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        const service = result.rows[0];
        let image_url = service.image_url;
        if (!image_url) {
            image_url = await getPexelsFallbackImage(service.name);
        }
        service.image_url = getFullImageUrl(req, image_url);

        return res.json({ success: true, service });
    } catch (err) {
        console.error('getServiceById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// CREATE SERVICE
const createService = async (req, res) => {
    const { name, category, subcategory, description, base_price, duration_minutes, benefits, required_certification, experience_level, tools, image_url, status, assigned_staff_ids } = req.body;

    if (!name) {
        return res.status(400).json({ success: false, message: 'Service name is required.' });
    }

    try {
        const savedImageUrl = handleServiceImage(image_url);
        const staffIds = ensureArray(assigned_staff_ids);

        let staffDetails = [];
        const validStaffIds = staffIds.filter(isValidUUID);
        if (validStaffIds.length > 0) {
            const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [validStaffIds]);
            staffDetails = staffResult.rows.map(r => ({
                id: r.id,
                name: `${r.first_name} ${r.last_name}`.trim(),
                email: r.email
            }));
        }

        let creatorId = req.user?.id || null;
        if (creatorId && isValidUUID(creatorId)) {
            const userExists = await query('SELECT id FROM team_members WHERE id = $1', [creatorId]);
            if (!userExists.rows.length) {
                creatorId = null;
            }
        } else {
            creatorId = null;
        }

        const result = await query(
            'INSERT INTO services (name, category, subcategory, description, base_price, duration_minutes, benefits, required_certification, experience_level, tools, image_url, status, assigned_staff_ids, assigned_staff_details, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
            [
                name.trim(), category || null, subcategory || null, description || null,
                base_price || null, duration_minutes || null, benefits || null,
                required_certification || null, experience_level || null, tools || null,
                savedImageUrl, (status || 'ACTIVE').toUpperCase(),
                JSON.stringify(validStaffIds), JSON.stringify(staffDetails), creatorId
            ]
        );

        const service = result.rows[0];

        for (const staffId of validStaffIds) {
            await allocateStaffMember(staffId, service);
        }

        service.image_url = getFullImageUrl(req, service.image_url);

        return res.status(201).json({ success: true, message: 'Service created.', service });
    } catch (err) {
        console.error('createService error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE SERVICE
const updateService = async (req, res) => {
    const { name, category, subcategory, description, base_price, duration_minutes, benefits, required_certification, experience_level, tools, image_url, status, assigned_staff_ids } = req.body;

    if (!isValidUUID(req.params.id)) {
        return res.status(404).json({ success: false, message: 'Service not found.' });
    }

    try {
        const existingResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (!existingResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        const existingService = existingResult.rows[0];
        const oldStaffIds = ensureArray(existingService.assigned_staff_ids);

        let savedImageUrl = undefined;
        if (image_url !== undefined) {
            savedImageUrl = handleServiceImage(image_url);
        }

        const fields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { fields.push('name = $' + idx++); values.push(name?.trim() || null); }
        if (category !== undefined) { fields.push('category = $' + idx++); values.push(category || null); }
        if (subcategory !== undefined) { fields.push('subcategory = $' + idx++); values.push(subcategory || null); }
        if (description !== undefined) { fields.push('description = $' + idx++); values.push(description || null); }
        if (base_price !== undefined) { fields.push('base_price = $' + idx++); values.push(base_price || null); }
        if (duration_minutes !== undefined) { fields.push('duration_minutes = $' + idx++); values.push(duration_minutes || null); }
        if (benefits !== undefined) { fields.push('benefits = $' + idx++); values.push(benefits || null); }
        if (required_certification !== undefined) { fields.push('required_certification = $' + idx++); values.push(required_certification || null); }
        if (experience_level !== undefined) { fields.push('experience_level = $' + idx++); values.push(experience_level || null); }
        if (tools !== undefined) { fields.push('tools = $' + idx++); values.push(tools || null); }
        if (savedImageUrl !== undefined) { fields.push('image_url = $' + idx++); values.push(savedImageUrl); }

        let isPublishingDraft = false;
        if (status !== undefined) {
            fields.push('status = $' + idx++);
            values.push(status?.toUpperCase() || null);
            if (existingService.status === 'DRAFT' && status?.toUpperCase() === 'ACTIVE') {
                isPublishingDraft = true;
            }
        } else if (existingService.status === 'DRAFT') {
            fields.push('status = $' + idx++);
            values.push('ACTIVE');
            isPublishingDraft = true;
        }

        if (assigned_staff_ids !== undefined) {
            const staffIdsArr = ensureArray(assigned_staff_ids);
            fields.push('assigned_staff_ids = $' + idx++);
            values.push(JSON.stringify(staffIdsArr));

            const validAssignedStaffIds = staffIdsArr.filter(isValidUUID);
            let staffDetails = [];
            if (validAssignedStaffIds.length > 0) {
                const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [validAssignedStaffIds]);
                staffDetails = staffResult.rows.map(r => ({
                    id: r.id,
                    name: `${r.first_name} ${r.last_name}`.trim(),
                    email: r.email
                }));
            }
            fields.push('assigned_staff_details = $' + idx++);
            values.push(JSON.stringify(staffDetails));

            const removedStaff = oldStaffIds.filter(id => !validAssignedStaffIds.includes(id));
            const addedStaff = validAssignedStaffIds.filter(id => !oldStaffIds.includes(id));

            for (const staffId of removedStaff) {
                await deallocateStaffMember(staffId);
            }

            const serviceForAlloc = { ...existingService, name: name || existingService.name, status: status || 'ACTIVE' };
            for (const staffId of addedStaff) {
                await allocateStaffMember(staffId, serviceForAlloc);
            }
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(req.params.id);
        const result = await query(
            'UPDATE services SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *',
            values
        );
        const updatedService = result.rows[0];

        if (isPublishingDraft) {
            const finalStaffIds = ensureArray(updatedService.assigned_staff_ids);
            const addedStaff = assigned_staff_ids !== undefined ? ensureArray(assigned_staff_ids).filter(id => !oldStaffIds.includes(id)) : [];
            const staffToEmail = finalStaffIds.filter(id => !addedStaff.includes(id));
            for (const staffId of staffToEmail) {
                await sendEmailForAllocation(staffId, updatedService);
            }
        }

        updatedService.image_url = getFullImageUrl(req, updatedService.image_url);

        return res.json({ success: true, message: 'Service updated.', service: updatedService });
    } catch (err) {
        console.error('updateService error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// DELETE SERVICE
const deleteService = async (req, res) => {
    try {
        const service = await query('SELECT assigned_staff_ids FROM services WHERE id = $1', [req.params.id]);
        if (service.rows.length && service.rows[0].assigned_staff_ids) {
            const staffIds = ensureArray(service.rows[0].assigned_staff_ids);
            const validStaffIds = staffIds.filter(isValidUUID);
            for (const staffId of validStaffIds) {
                await deallocateStaffMember(staffId);
            }
        }

        const result = await query('DELETE FROM services WHERE id = $1 RETURNING id', [req.params.id]);
        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        return res.json({ success: true, message: 'Service deleted.' });
    } catch (err) {
        console.error('deleteService error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// UPDATE SERVICE STAFF
const updateServiceStaff = async (req, res) => {
    const assigned_staff_ids = ensureArray(req.body.assigned_staff_ids);

    try {
        const serviceResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (!serviceResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        const service = serviceResult.rows[0];
        const oldStaffIds = ensureArray(service.assigned_staff_ids);

        const validAssignedStaffIds = assigned_staff_ids.filter(isValidUUID);
        const removedStaff = oldStaffIds.filter(id => !validAssignedStaffIds.includes(id));
        const addedStaff = validAssignedStaffIds.filter(id => !oldStaffIds.includes(id));

        let staffDetails = [];
        if (validAssignedStaffIds.length > 0) {
            const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [validAssignedStaffIds]);
            staffDetails = staffResult.rows.map(r => ({
                id: r.id,
                name: `${r.first_name} ${r.last_name}`.trim(),
                email: r.email
            }));
        }

        await query('UPDATE services SET assigned_staff_ids = $1, assigned_staff_details = $2 WHERE id = $3', [JSON.stringify(assigned_staff_ids), JSON.stringify(staffDetails), req.params.id]);

        for (const staffId of removedStaff) {
            await deallocateStaffMember(staffId);
        }

        for (const staffId of addedStaff) {
            await allocateStaffMember(staffId, service);
        }

        const updated = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        const updatedServiceObj = updated.rows[0];
        if (updatedServiceObj) {
            updatedServiceObj.image_url = getFullImageUrl(req, updatedServiceObj.image_url);
        }
        return res.json({ success: true, message: 'Staff allocations updated.', service: updatedServiceObj });
    } catch (err) {
        console.error('updateServiceStaff error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// COMPLETE SERVICE ALLOCATION
const completeServiceAllocation = async (req, res) => {
    const { staff_id } = req.body;
    if (!staff_id) {
        return res.status(400).json({ success: false, message: 'staff_id is required.' });
    }

    try {
        // Only try to update service if id is a valid UUID
        if (isValidUUID(req.params.id)) {
            const serviceResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
            if (!serviceResult.rows.length) {
                return res.status(404).json({ success: false, message: 'Service not found.' });
            }

            const service = serviceResult.rows[0];
            let staffIds = service.assigned_staff_ids || [];
            staffIds = staffIds.filter(id => String(id) !== String(staff_id));

            let staffDetails = service.assigned_staff_details || [];
            staffDetails = staffDetails.filter(s => String(s.id) !== String(staff_id));

            await query('UPDATE services SET assigned_staff_ids = $1, assigned_staff_details = $2 WHERE id = $3', [JSON.stringify(staffIds), JSON.stringify(staffDetails), req.params.id]);
        }
        
        // Only call deallocateStaffMember if staff_id is a valid UUID
        if (isValidUUID(staff_id)) {
            try {
                await deallocateStaffMember(staff_id);
            } catch (deallocErr) {
                // Ignore if staff_id isn't found
                console.warn('completeServiceAllocation: deallocateStaffMember skipped (staff not found):', deallocErr.message);
            }
        } else {
            console.warn('completeServiceAllocation: deallocateStaffMember skipped (invalid UUID):', staff_id);
        }

        return res.json({ success: true, message: 'Staff allocation completed. Staff is now Available.' });
    } catch (err) {
        console.error('completeServiceAllocation error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET SERVICE ALLOCATIONS
const getServiceAllocations = async (req, res) => {
    try {
        const result = await query(
            `SELECT s.id AS service_id, s.name, s.assigned_staff_ids, tm.id AS staff_id, tm.first_name, tm.last_name, tm.email, tm.role_id, r.name AS role, tm.availability_status, tm.allocation_details 
             FROM services s 
             LEFT JOIN LATERAL jsonb_array_elements_text(s.assigned_staff_ids) AS staff_id_text ON true
             LEFT JOIN team_members tm ON tm.id::text = staff_id_text 
             LEFT JOIN roles r ON r.id = tm.role_id 
             WHERE s.id = $1`,
            [req.params.id]
        );

        return res.json({ success: true, allocations: result.rows });
    } catch (err) {
        console.error('getServiceAllocations error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// GET MY ASSIGNMENTS — returns services, workshops, and Vedic programs from central allocations table
const getMyAssignments = async (req, res) => {
    try {
        let userId = req.query.staff_id || req.user?.id || req.user?.user_id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID not found.' });
        }

        const userResult = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.phone, tm.availability_status, tm.allocation_details, r.name AS role 
             FROM team_members tm 
             JOIN roles r ON r.id = tm.role_id 
             WHERE tm.id::text = $1 OR tm.email ILIKE $1 
             LIMIT 1`,
            [userId]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Staff member not found.' });
        }

        const user = userResult.rows[0];
        const staffUuid = user.id;
        const staffCode = `STAFF-${String(staffUuid).slice(0, 6).toUpperCase()}`;
        const staffName = `${user.first_name || ''} ${user.last_name || ''}`.trim();

        const assignments = [];

        // Fetch all assignments from unified allocations table
        const allocationsResult = await query(
            `SELECT a.id, a.type, a.session_title, a.session_id, a.start_date, a.end_date, a.booking_time, a.duration_minutes, a.status, a.created_at,
                    tm.id AS staff_uuid, tm.first_name, tm.last_name, tm.email AS staff_email, tm.phone AS staff_phone, r.name AS role
             FROM allocations a
             JOIN team_members tm ON tm.id = a.staff_id
             JOIN roles r ON r.id = tm.role_id
             LEFT JOIN deleted_booking_ids d ON d.booking_id = CASE WHEN a.type = 'service' AND a.session_id ~ '^[0-9]+$' THEN CAST(a.session_id AS INTEGER) ELSE NULL END
             WHERE a.staff_id = $1 AND d.booking_id IS NULL
             ORDER BY a.start_date DESC, a.created_at DESC`,
            [staffUuid]
        );

        for (const alloc of allocationsResult.rows) {
            const assignment = {
                id: alloc.id,
                type: alloc.type,
                staffId: staffUuid,
                staffCode: staffCode,
                staffName: staffName,
                staffEmail: user.email,
                staffRole: user.role,
                staffPhone: user.phone || null,
                sessionTitle: alloc.session_title,
                sessionId: alloc.session_id,
                displayRecordId: alloc.session_id,
                startDate: alloc.start_date,
                bookingTime: alloc.booking_time,
                endDate: alloc.end_date,
                duration: alloc.duration_minutes || 30,
                status: alloc.status,
                createdAt: alloc.created_at,
                customerName: "Assigned Customer",
                customerEmail: null,
                recordDetails: null
            };

            // 1. Service Booking details
            if (alloc.type === 'service') {
                try {
                    let bRes = { rows: [] };
                    if (/^\d+$/.test(String(alloc.session_id))) {
                        bRes = await query(`SELECT * FROM bookings WHERE id = $1 LIMIT 1`, [parseInt(alloc.session_id, 10)]);
                    } else if (isValidUUID(alloc.session_id)) {
                        bRes = await query(`SELECT * FROM bookings WHERE id::text = $1 LIMIT 1`, [alloc.session_id]);
                    }
                    if (bRes.rows.length > 0) {
                        const b = bRes.rows[0];
                        assignment.displayRecordId = `BKG-${String(b.id).padStart(3, '0')}`;
                        assignment.customerName = b.user_name || b.customer_name || "Valued Customer";
                        assignment.customerEmail = b.user_email || b.customer_email || b.email || null;
                        assignment.sessionTitle = b.service_name || alloc.session_title;
                        assignment.bookingTime = b.booking_time || alloc.booking_time;
                        assignment.recordDetails = {
                            booking_id: assignment.displayRecordId,
                            service_name: b.service_name,
                            customer_name: assignment.customerName,
                            customer_email: assignment.customerEmail,
                            booking_date: b.booking_date,
                            booking_time: b.booking_time,
                            status: b.status
                        };
                    }
                } catch (bErr) {
                    console.warn(`[MyAssignments] Error fetching service details for ${alloc.session_id}:`, bErr.message);
                }
            }

            // 2. Workshop details
            else if (alloc.type === 'workshop') {
                try {
                    let wsRes = { rows: [] };
                    if (/^\d+$/.test(String(alloc.session_id))) {
                        wsRes = await query(`SELECT * FROM workshops WHERE id = $1 LIMIT 1`, [parseInt(alloc.session_id, 10)]);
                    } else if (isValidUUID(alloc.session_id)) {
                        wsRes = await query(`SELECT * FROM workshops WHERE id::text = $1 LIMIT 1`, [alloc.session_id]);
                    }
                    if (wsRes.rows.length > 0) {
                        const ws = wsRes.rows[0];
                        assignment.displayRecordId = `WS-${String(ws.id).padStart(3, '0')}`;
                        assignment.sessionTitle = ws.title || alloc.session_title;
                        assignment.workshop_image_name = ws.image_url;

                        const attRes = await query(`SELECT name, email FROM attendees WHERE workshop_id = $1 LIMIT 5`, [ws.id]);
                        if (attRes.rows.length > 0) {
                            assignment.customerName = attRes.rows.map(a => a.name).join(", ");
                            assignment.customerEmail = attRes.rows[0].email;
                        } else {
                            assignment.customerName = "Workshop Participants";
                        }
                        assignment.recordDetails = {
                            workshop_id: assignment.displayRecordId,
                            workshop_title: ws.title,
                            category: ws.category,
                            date: ws.date,
                            time: ws.time,
                            capacity: ws.capacity,
                            attendees_count: attRes.rows.length,
                            attendees: attRes.rows
                        };
                    }
                } catch (wsErr) {
                    console.warn(`[MyAssignments] Error fetching workshop details for ${alloc.session_id}:`, wsErr.message);
                }
            }

            // 3. Vedic Life Program details
            else if (alloc.type === 'vedic_program') {
                try {
                    let vpRes = { rows: [] };
                    if (/^\d+$/.test(String(alloc.session_id))) {
                        vpRes = await query(`SELECT * FROM vedic_programs WHERE id = $1 LIMIT 1`, [parseInt(alloc.session_id, 10)]);
                    } else if (isValidUUID(alloc.session_id)) {
                        vpRes = await query(`SELECT * FROM vedic_programs WHERE id::text = $1 LIMIT 1`, [alloc.session_id]);
                    }
                    if (vpRes.rows.length > 0) {
                        const vp = vpRes.rows[0];
                        assignment.displayRecordId = `VP-${String(vp.id).padStart(3, '0')}`;
                        assignment.sessionTitle = vp.title || alloc.session_title;
                        assignment.vediclife_image_name = vp.image_url;

                        const vattRes = await query(`SELECT name, email FROM vedic_attendees WHERE program_id = $1 LIMIT 5`, [vp.id]);
                        if (vattRes.rows.length > 0) {
                            assignment.customerName = vattRes.rows.map(v => v.name).join(", ");
                            assignment.customerEmail = vattRes.rows[0].email;
                        } else {
                            assignment.customerName = "Program Participants";
                        }
                        assignment.recordDetails = {
                            program_id: assignment.displayRecordId,
                            program_title: vp.title,
                            type: vp.type,
                            start_date: vp.start_date,
                            end_date: vp.end_date,
                            services: vp.services,
                            attendees_count: vattRes.rows.length,
                            attendees: vattRes.rows
                        };
                    }
                } catch (vpErr) {
                    console.warn(`[MyAssignments] Error fetching vedic program details for ${alloc.session_id}:`, vpErr.message);
                }
            }

            assignments.push(assignment);
        }

        return res.json({
            success: true,
            staff: {
                staffId: staffUuid,
                staffCode: staffCode,
                name: staffName,
                email: user.email,
                role: user.role
            },
            assignments
        });
    } catch (err) {
        console.error('getMyAssignments error:', err);
        return res.status(500).json({ success: false, message: 'Server error.', detail: err.message });
    }
};

module.exports = {
    getAllServices, getServiceById, createService,
    updateService, deleteService,
    updateServiceStaff, completeServiceAllocation, getServiceAllocations,
    getMyAssignments
};