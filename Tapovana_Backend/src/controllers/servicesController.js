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

// Helper: Allocate a single staff member
const allocateStaffMember = async (staffId, service) => {
    const allocationDetails = {
        id: service.id,
        type: 'service',
        sessionTitle: service.name,
        sessionId: service.id,
        startDate: new Date().toISOString(),
        endDate: null
    };

    await query(
        'UPDATE team_members SET availability_status = $1, allocation_details = $2::jsonb WHERE id = $3 AND status = $4',
        ['Allocated', JSON.stringify(allocationDetails), staffId, 'active']
    );

    // Send email notification (fire and forget - don't block)
    if (service.status !== 'DRAFT') {
        await sendEmailForAllocation(staffId, service);
    }
};

// Helper: Deallocate a single staff member
const deallocateStaffMember = async (staffId) => {
    await query(
        'UPDATE team_members SET availability_status = $1, allocation_details = NULL WHERE id = $2 AND availability_status = $3',
        ['Available', staffId, 'Allocated']
    );
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
        const staffIds = assigned_staff_ids || [];

        let staffDetails = [];
        if (staffIds.length > 0) {
            const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [staffIds]);
            staffDetails = staffResult.rows.map(r => ({
                id: r.id,
                name: `${r.first_name} ${r.last_name}`.trim(),
                email: r.email
            }));
        }

        const result = await query(
            'INSERT INTO services (name, category, subcategory, description, base_price, duration_minutes, benefits, required_certification, experience_level, tools, image_url, status, assigned_staff_ids, assigned_staff_details, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING *',
            [
                name.trim(), category || null, subcategory || null, description || null,
                base_price || null, duration_minutes || null, benefits || null,
                required_certification || null, experience_level || null, tools || null,
                savedImageUrl, (status || 'ACTIVE').toUpperCase(),
                JSON.stringify(staffIds), JSON.stringify(staffDetails), req.user?.id || null
            ]
        );

        const service = result.rows[0];

        for (const staffId of staffIds) {
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

    try {
        const existingResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (!existingResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }
        const existingService = existingResult.rows[0];
        const oldStaffIds = existingService.assigned_staff_ids || [];

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
        if (status !== undefined) { fields.push('status = $' + idx++); values.push(status?.toUpperCase() || null); }

        // Auto-activate DRAFT on update
        let isPublishingDraft = false;
        if (existingService.status === 'DRAFT' && (status === 'ACTIVE' || status === undefined)) {
            fields.push('status = $' + idx++);
            values.push('ACTIVE');
            isPublishingDraft = true;
        }

        if (assigned_staff_ids !== undefined) {
            fields.push('assigned_staff_ids = $' + idx++);
            values.push(JSON.stringify(assigned_staff_ids));

            let staffDetails = [];
            if (assigned_staff_ids.length > 0) {
                const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [assigned_staff_ids]);
                staffDetails = staffResult.rows.map(r => ({
                    id: r.id,
                    name: `${r.first_name} ${r.last_name}`.trim(),
                    email: r.email
                }));
            }
            fields.push('assigned_staff_details = $' + idx++);
            values.push(JSON.stringify(staffDetails));

            const removedStaff = oldStaffIds.filter(id => !assigned_staff_ids.includes(id));
            const addedStaff = assigned_staff_ids.filter(id => !oldStaffIds.includes(id));

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
            const finalStaffIds = updatedService.assigned_staff_ids || [];
            const addedStaff = assigned_staff_ids !== undefined ? assigned_staff_ids.filter(id => !oldStaffIds.includes(id)) : [];
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
            const staffIds = service.rows[0].assigned_staff_ids;
            for (const staffId of staffIds) {
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
    const { assigned_staff_ids } = req.body;
    if (!Array.isArray(assigned_staff_ids)) {
        return res.status(400).json({ success: false, message: 'assigned_staff_ids must be an array.' });
    }

    try {
        const serviceResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (!serviceResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        const service = serviceResult.rows[0];
        const oldStaffIds = service.assigned_staff_ids || [];

        const removedStaff = oldStaffIds.filter(id => !assigned_staff_ids.includes(id));
        const addedStaff = assigned_staff_ids.filter(id => !oldStaffIds.includes(id));

        let staffDetails = [];
        if (assigned_staff_ids.length > 0) {
            const staffResult = await query('SELECT id, first_name, last_name, email FROM team_members WHERE id = ANY($1::uuid[])', [assigned_staff_ids]);
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
        const serviceResult = await query('SELECT * FROM services WHERE id = $1', [req.params.id]);
        if (!serviceResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        const service = serviceResult.rows[0];
        let staffIds = service.assigned_staff_ids || [];
        staffIds = staffIds.filter(id => id !== staff_id);

        let staffDetails = service.assigned_staff_details || [];
        staffDetails = staffDetails.filter(s => s.id !== staff_id);

        await query('UPDATE services SET assigned_staff_ids = $1, assigned_staff_details = $2 WHERE id = $3', [JSON.stringify(staffIds), JSON.stringify(staffDetails), req.params.id]);
        await deallocateStaffMember(staff_id);

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
            'SELECT s.id AS service_id, s.name, s.assigned_staff_ids, tm.id AS staff_id, tm.first_name, tm.last_name, tm.email, tm.role_id, r.name AS role, tm.availability_status, tm.allocation_details FROM services s LEFT JOIN team_members tm ON tm.id = ANY(SELECT jsonb_array_elements_text(s.assigned_staff_ids)::uuid) LEFT JOIN roles r ON r.id = tm.role_id WHERE s.id = $1',
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
        const userId = req.user?.id || req.user?.user_id || req.user?._id;

        if (!userId) {
            return res.status(401).json({ success: false, message: 'User ID not found in token.' });
        }

        const userResult = await query(
            'SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.availability_status, tm.allocation_details, r.name AS role FROM team_members tm JOIN roles r ON r.id = tm.role_id WHERE tm.id = $1',
            [userId]
        );

        if (!userResult.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const user = userResult.rows[0];

        const assignments = [];

        // Fetch all assignments from unified allocations table
        const allocationsResult = await query(
            `SELECT a.id, a.type, a.session_title, a.session_id, a.start_date, a.end_date, a.booking_time, a.duration_minutes, a.status, a.created_at,
                    tm.first_name, tm.last_name, r.name AS role
             FROM allocations a
             JOIN team_members tm ON tm.id = a.staff_id
             JOIN roles r ON r.id = tm.role_id
             LEFT JOIN deleted_booking_ids d ON d.booking_id = CASE WHEN a.type = 'service' AND a.session_id ~ '^[0-9]+$' THEN CAST(a.session_id AS INTEGER) ELSE NULL END
             WHERE a.staff_id = $1 AND d.booking_id IS NULL
             ORDER BY a.start_date DESC, a.created_at DESC`,
            [userId]
        );

        for (const alloc of allocationsResult.rows) {
            assignments.push({
                id: alloc.id,
                type: alloc.type,
                staffId: userId,
                staffName: `${alloc.first_name || ''} ${alloc.last_name || ''}`.trim(),
                staffRole: alloc.role,
                sessionTitle: alloc.session_title,
                sessionId: alloc.session_id,
                startDate: alloc.start_date,
                bookingTime: alloc.booking_time,
                endDate: alloc.end_date,
                status: alloc.status,
                createdAt: alloc.created_at
            });
        }

        return res.json({ success: true, assignments });
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