const { query } = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

// ─── Helper: handle image ─────────────────────────────────────────────
const handleProfileImage = (imageData) => {
    if (!imageData || typeof imageData !== 'string') return null;
    const matches = imageData.match(/^data:(image\/(jpeg|png|webp|gif|svg\+xml));base64,(.+)$/);
    if (matches && matches.length === 4) {
        const mime = matches[1];
        const extMap = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif', 'image/svg+xml': '.svg' };
        const ext = extMap[mime] || '.png';
        const buffer = Buffer.from(matches[3], 'base64');
        const filename = uuidv4() + ext;
        ensureUploadsDir();
        fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);
        return '/uploads/' + filename;
    }
    if (/^https?:\/\//.test(imageData) || imageData.startsWith('/uploads/')) return imageData;
    return imageData;
};

// ─── GET all memberships ──────────────────────────────────────────────
const getAllMemberships = async (req, res) => {
    try {
        const { tier, status, page = 1, limit = 50 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (tier && tier !== 'ALL') { conditions.push('m.tier = $' + idx++); values.push(tier.toUpperCase()); }
        if (status && status !== 'ALL') { conditions.push('m.status = $' + idx++); values.push(status.toLowerCase()); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        const countResult = await query('SELECT COUNT(*) FROM memberships m ' + whereClause, values);
        const total = parseInt(countResult.rows[0].count);

        const result = await query(
            'SELECT m.*, tm.first_name AS created_by_name FROM memberships m LEFT JOIN team_members tm ON tm.id = m.created_by ' +
            whereClause + ' ORDER BY m.created_at DESC LIMIT $' + idx + ' OFFSET $' + (idx + 1),
            [...values, parseInt(limit), offset]
        );

        // Fetch remote memberships to get latest profile pictures
        let remoteMembers = [];
        try {
            const response = await fetch('https://tapoclg.onrender.com/api/membership');
            if (response.ok) {
                const data = await response.json();
                remoteMembers = data.success ? (data.memberships || []) : [];
            }
        } catch (fetchErr) {
            console.error('Failed to fetch memberships from mobile backend:', fetchErr);
        }

        const remoteMembersMap = new Map();
        for (const rm of remoteMembers) {
            if (rm.customer_email) {
                remoteMembersMap.set(rm.customer_email.toLowerCase(), rm.profile_pic);
            }
        }

        const formattedMemberships = result.rows.map(row => {
            let profilePhoto = null;
            const emailKey = row.email ? row.email.toLowerCase() : '';
            let pic = remoteMembersMap.get(emailKey) || row.profile_photo_url;
            
            if (pic) {
                if (pic.startsWith('http')) {
                    profilePhoto = pic;
                } else if (pic.startsWith('/uploads/profile_photo-') || remoteMembersMap.has(emailKey)) {
                    profilePhoto = `https://tapoclg.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
                } else {
                    // Local server upload
                    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
                    const host = req.headers['x-forwarded-host'] || req.headers.host;
                    profilePhoto = `${protocol}://${host}${pic.startsWith('/') ? '' : '/'}${pic}`;
                }
            }

            return {
                ...row,
                profilePhoto
            };
        });

        return res.json({ success: true, count: formattedMemberships.length, memberships: formattedMemberships, pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) } });
    } catch (err) {
        console.error('getAllMemberships error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET single membership ────────────────────────────────────────────
const getMembershipById = async (req, res) => {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
        return res.status(400).json({ success: false, message: 'Invalid membership ID.' });
    }
    try {
        const result = await query('SELECT m.*, tm.first_name AS created_by_name FROM memberships m LEFT JOIN team_members tm ON tm.id = m.created_by WHERE m.id = $1', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Membership not found.' });
        
        const row = result.rows[0];
        
        // Fetch remote memberships to get latest profile picture for this member
        let remotePic = null;
        if (row.email) {
            try {
                const response = await fetch('https://tapoclg.onrender.com/api/membership');
                if (response.ok) {
                    const data = await response.json();
                    const remoteMembers = data.success ? (data.memberships || []) : [];
                    const match = remoteMembers.find(rm => rm.customer_email && rm.customer_email.toLowerCase() === row.email.toLowerCase());
                    if (match) {
                        remotePic = match.profile_pic;
                    }
                }
            } catch (fetchErr) {
                console.error('Failed to fetch membership from mobile backend:', fetchErr);
            }
        }
        
        let profilePhoto = null;
        let pic = remotePic || row.profile_photo_url;
        if (pic) {
            if (pic.startsWith('http')) {
                profilePhoto = pic;
            } else if (pic.startsWith('/uploads/profile_photo-') || remotePic) {
                profilePhoto = `https://tapoclg.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
            } else {
                // Local server upload
                const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
                const host = req.headers['x-forwarded-host'] || req.headers.host;
                profilePhoto = `${protocol}://${host}${pic.startsWith('/') ? '' : '/'}${pic}`;
            }
        }
        
        return res.json({ success: true, membership: { ...row, profilePhoto } });
    } catch (err) {
        console.error('getMembershipById error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const enrichMembership = (req, row) => {
    if (!row) return null;
    let profilePhoto = null;
    let pic = row.profile_photo_url;
    if (pic) {
        if (pic.startsWith('http')) {
            profilePhoto = pic;
        } else if (pic.startsWith('/uploads/profile_photo-')) {
            profilePhoto = `https://tapoclg.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
        } else {
            // Local server upload
            const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
            const host = req.headers['x-forwarded-host'] || req.headers.host;
            profilePhoto = `${protocol}://${host}${pic.startsWith('/') ? '' : '/'}${pic}`;
        }
    }
    return { ...row, profilePhoto };
};

// ─── CREATE membership ────────────────────────────────────────────────
const createMembership = async (req, res) => {
    const { name, email, phone, tier, status, sessions, total_spent, profile_photo_url, profile_photo_base64 } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Name is required.' });

    try {
        const savedImage = handleProfileImage(profile_photo_base64 || profile_photo_url);
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);

        const result = await query(
            'INSERT INTO memberships (name, email, phone, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [name.trim(), email || null, phone || null, (tier || 'SILVER').toUpperCase(), new Date().toISOString().split('T')[0], expiryDate.toISOString().split('T')[0], sessions || 0, total_spent || 0, (status || 'active').toLowerCase(), savedImage, req.user?.id || null]
        );

        return res.status(201).json({ success: true, message: 'Membership created.', membership: enrichMembership(req, result.rows[0]) });
    } catch (err) {
        console.error('createMembership error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── UPDATE membership ────────────────────────────────────────────────
const updateMembership = async (req, res) => {
    const { name, email, phone, tier, status, sessions, total_spent, profile_photo_url, profile_photo_base64 } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (name !== undefined) { fields.push('name = $' + idx++); values.push(name?.trim() || null); }
        if (email !== undefined) { fields.push('email = $' + idx++); values.push(email || null); }
        if (phone !== undefined) { fields.push('phone = $' + idx++); values.push(phone || null); }
        if (tier !== undefined) { fields.push('tier = $' + idx++); values.push(tier.toUpperCase()); }
        if (status !== undefined) { fields.push('status = $' + idx++); values.push(status.toLowerCase()); }
        if (sessions !== undefined) { fields.push('sessions = $' + idx++); values.push(sessions || 0); }
        if (total_spent !== undefined) { fields.push('total_spent = $' + idx++); values.push(total_spent || 0); }
        if (profile_photo_url !== undefined || profile_photo_base64 !== undefined) {
            const savedImage = handleProfileImage(profile_photo_base64 || profile_photo_url);
            if (savedImage !== undefined) { fields.push('profile_photo_url = $' + idx++); values.push(savedImage); }
        }

        if (!fields.length) return res.status(400).json({ success: false, message: 'No fields to update.' });

        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid membership ID.' });
        values.push(id);
        const result = await query('UPDATE memberships SET ' + fields.join(', ') + ' WHERE id = $' + idx + ' RETURNING *', values);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Membership not found.' });
        return res.json({ success: true, message: 'Membership updated.', membership: enrichMembership(req, result.rows[0]) });
    } catch (err) {
        console.error('updateMembership error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── DELETE membership ────────────────────────────────────────────────
const deleteMembership = async (req, res) => {
    try {
        const id = parseInt(req.params.id, 10);
        if (isNaN(id)) return res.status(400).json({ success: false, message: 'Invalid membership ID.' });
        const result = await query('DELETE FROM memberships WHERE id = $1 RETURNING id', [id]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Membership not found.' });
        return res.json({ success: true, message: 'Membership deleted.' });
    } catch (err) {
        console.error('deleteMembership error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET all tiers ────────────────────────────────────────────────────
const getAllTiers = async (req, res) => {
    try {
        const result = await query('SELECT * FROM membership_tiers ORDER BY price ASC');
        return res.json({ success: true, tiers: result.rows });
    } catch (err) {
        console.error('getAllTiers error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── UPDATE tier ──────────────────────────────────────────────────────
const updateTier = async (req, res) => {
    const { price, benefits } = req.body;
    try {
        const result = await query('UPDATE membership_tiers SET price = $1, benefits = $2 WHERE name = $3 RETURNING *', [price || 0, JSON.stringify(benefits || []), req.params.name.toUpperCase()]);
        if (!result.rows.length) return res.status(404).json({ success: false, message: 'Tier not found.' });
        return res.json({ success: true, message: 'Tier updated.', tier: result.rows[0] });
    } catch (err) {
        console.error('updateTier error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Sync from Render API ─────────────────────────────────────────────
const syncFromRender = async (req, res) => {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/membership');
        const data = await response.json();
        if (!data.success || !data.memberships) return res.status(400).json({ success: false, message: 'Failed to fetch from Render API.' });

        let synced = 0;
        for (const m of data.memberships) {
            const existing = await query('SELECT id FROM memberships WHERE email = $1', [m.customer_email || '']);
            if (existing.rows.length) continue;

            const tierMap = { 'SILVER PASS': 'SILVER', 'GOLD PASS': 'GOLD', 'DIAMOND PASS': 'PLATINUM' };
            const mappedTier = tierMap[m.membership_name] || 'SILVER';
            const expiry = new Date(m.purchase_date);
            expiry.setFullYear(expiry.getFullYear() + 1);

            await query(
                'INSERT INTO memberships (name, email, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                [m.customer_name, m.customer_email, mappedTier, m.purchase_date, expiry.toISOString().split('T')[0], m.available_credits || 0, 0, 'active', m.profile_pic]
            );
            synced++;
        }
        return res.json({ success: true, message: 'Sync complete.', synced: synced, total: data.memberships.length });
    } catch (err) {
        console.error('syncFromRender error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

module.exports = { getAllMemberships, getMembershipById, createMembership, updateMembership, deleteMembership, getAllTiers, updateTier, syncFromRender };