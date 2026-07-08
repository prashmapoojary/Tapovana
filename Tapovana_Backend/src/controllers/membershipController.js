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

// ─── Sync mobile memberships helper ───────────────────────────────────
const syncMembershipsInternal = async () => {
    const urls = [
        'https://tapovana.onrender.com/api/memberships',
        'https://tapoclg.onrender.com/api/membership'
    ];
    let totalSynced = 0;

    for (const url of urls) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (!data.success || !data.memberships) continue;

            for (const m of data.memberships) {
                const emailVal = m.customer_email || m.email;
                if (!emailVal) continue;
                const existing = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [emailVal.trim()]);
                
                const tierMap = { 'SILVER PASS': 'SILVER', 'GOLD PASS': 'GOLD', 'DIAMOND PASS': 'PLATINUM' };
                const rawTier = m.membership_name || m.tier || 'SILVER';
                const mappedTier = tierMap[rawTier.toUpperCase()] || rawTier.toUpperCase();
                
                let joinVal = m.purchase_date || m.join_date || new Date().toISOString();
                const expiry = new Date(joinVal);
                expiry.setFullYear(expiry.getFullYear() + 1);
                const expiryStr = expiry.toISOString().split('T')[0];

                const nameVal = m.customer_name || m.name || 'Unknown';
                const sessionsVal = m.available_credits !== undefined ? m.available_credits : (m.sessions || 0);
                const picVal = m.profile_pic || m.profile_photo_url || null;

                if (existing.rows.length) {
                    await query(
                        'UPDATE memberships SET name = $1, tier = $2, join_date = $3, expiry_date = $4, sessions = $5, profile_photo_url = $6, status = $7 WHERE LOWER(email) = LOWER($8)',
                        [nameVal, mappedTier, joinVal, expiryStr, sessionsVal, picVal, 'active', emailVal.trim()]
                    );
                } else {
                    await query(
                        'INSERT INTO memberships (name, email, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                        [nameVal, emailVal.trim(), mappedTier, joinVal, expiryStr, sessionsVal, 0, 'active', picVal]
                    );
                    totalSynced++;
                }
            }
        } catch (err) {
            console.error(`syncMembershipsInternal error for ${url}:`, err);
        }
    }
    return totalSynced;
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
        // Auto-sync mobile memberships first
        await syncMembershipsInternal();

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

        // Fetch remote memberships to get latest profile pictures from both urls
        let remoteMembers = [];
        const remoteUrls = [
            'https://tapovana.onrender.com/api/memberships',
            'https://tapoclg.onrender.com/api/membership'
        ];
        for (const url of remoteUrls) {
            try {
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.memberships) {
                        remoteMembers = remoteMembers.concat(data.memberships);
                    }
                }
            } catch (fetchErr) {
                console.error(`Failed to fetch memberships from ${url}:`, fetchErr);
            }
        }

        const remoteMembersMap = new Map();
        for (const rm of remoteMembers) {
            const emailKey = rm.customer_email || rm.email;
            const pic = rm.profile_pic || rm.profile_photo_url;
            if (emailKey && pic) {
                remoteMembersMap.set(emailKey.toLowerCase(), pic);
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
                    profilePhoto = `https://tapovana.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
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
            const remoteUrls = [
                'https://tapovana.onrender.com/api/memberships',
                'https://tapoclg.onrender.com/api/membership'
            ];
            for (const url of remoteUrls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        const remoteMembers = data.success ? (data.memberships || []) : [];
                        const match = remoteMembers.find(rm => {
                            const emailKey = rm.customer_email || rm.email;
                            return emailKey && emailKey.toLowerCase() === row.email.toLowerCase();
                        });
                        if (match) {
                            remotePic = match.profile_pic || match.profile_photo_url;
                            break;
                        }
                    }
                } catch (fetchErr) {
                    console.error(`Failed to fetch membership from ${url}:`, fetchErr);
                }
            }
        }
        
        let profilePhoto = null;
        let pic = remotePic || row.profile_photo_url;
        if (pic) {
            if (pic.startsWith('http')) {
                profilePhoto = pic;
            } else if (pic.startsWith('/uploads/profile_photo-') || remotePic) {
                profilePhoto = `https://tapovana.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
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
            profilePhoto = `https://tapovana.onrender.com${pic.startsWith('/') ? '' : '/'}${pic}`;
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
    const { name, email, phone, tier, status, sessions, total_spent, profile_photo_url, profile_photo_base64, join_date, expiry_date } = req.body;

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
        if (join_date !== undefined) { fields.push('join_date = $' + idx++); values.push(join_date || null); }
        if (expiry_date !== undefined) { fields.push('expiry_date = $' + idx++); values.push(expiry_date || null); }
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
        const idStr = String(req.params.id).trim();
        const cleanIdStr = idStr.replace(/^admin-/, '');
        let id = parseInt(cleanIdStr, 10);
        let result;
        let emailVal = null;

        if (isNaN(id)) {
            // It's a remote string ID like "mobile-admin-6" or "mobile-6"
            const remoteIdMatch = idStr.match(/\d+$/);
            const remoteId = remoteIdMatch ? parseInt(remoteIdMatch[0], 10) : null;

            if (remoteId) {
                const remoteUrls = [
                    'https://tapovana.onrender.com/api/memberships',
                    'https://tapoclg.onrender.com/api/membership'
                ];
                for (const url of remoteUrls) {
                    try {
                        const response = await fetch(url);
                        if (response.ok) {
                            const data = await response.json();
                            const remoteMembers = data.success ? (data.memberships || []) : [];
                            const match = remoteMembers.find(rm => {
                                const rid = rm.id || rm.user_id;
                                return rid && parseInt(rid, 10) === remoteId;
                            });
                            if (match) {
                                emailVal = match.customer_email || match.email;
                                break;
                            }
                        }
                    } catch (fetchErr) {
                        console.error('Error fetching remote memberships in deleteMembership:', fetchErr);
                    }
                }
            }

            if (emailVal) {
                result = await query('DELETE FROM memberships WHERE LOWER(email) = LOWER($1) RETURNING id', [emailVal.trim()]);
            } else {
                return res.status(400).json({ success: false, message: 'Invalid membership ID and no matching email found.' });
            }
        } else {
            const memRes = await query('SELECT email FROM memberships WHERE id = $1', [id]);
            emailVal = memRes.rows.length ? memRes.rows[0].email : null;
            result = await query('DELETE FROM memberships WHERE id = $1 RETURNING id', [id]);
        }

        if (!result || !result.rows.length) {
            return res.status(404).json({ success: false, message: 'Membership not found.' });
        }

        if (emailVal) {
            const remoteUrls = [
                'https://tapovana.onrender.com/api/memberships',
                'https://tapoclg.onrender.com/api/membership'
            ];
            for (const url of remoteUrls) {
                try {
                    const response = await fetch(url);
                    if (response.ok) {
                        const data = await response.json();
                        const remoteMembers = data.success ? (data.memberships || []) : [];
                        const match = remoteMembers.find(rm => {
                            const emailKey = rm.customer_email || rm.email;
                            return emailKey && emailKey.toLowerCase() === emailVal.toLowerCase();
                        });
                        if (match) {
                            const remoteId = match.id || match.user_id;
                            if (remoteId) {
                                await fetch(`${url}/${remoteId}`, { method: 'DELETE' }).catch(() => {});
                            }
                        }
                    }
                } catch (fetchErr) {
                    console.error(`Failed to delete remote membership at ${url}:`, fetchErr);
                }
            }
        }

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
        const synced = await syncMembershipsInternal();
        return res.json({ success: true, message: 'Sync complete.', synced });
    } catch (err) {
        console.error('syncFromRender error:', err);
        return res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
};

const getRemoteMobileMemberships = async (req, res) => {
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/membership');
        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: 'Failed to fetch remote mobile memberships.' });
        }
        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error('getRemoteMobileMemberships error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching remote mobile memberships.' });
    }
};

const getRemoteAdminMemberships = async (req, res) => {
    try {
        const response = await fetch('https://tapovana.onrender.com/api/memberships');
        if (!response.ok) {
            return res.status(response.status).json({ success: false, message: 'Failed to fetch remote admin memberships.' });
        }
        const data = await response.json();
        return res.json(data);
    } catch (err) {
        console.error('getRemoteAdminMemberships error:', err);
        return res.status(500).json({ success: false, message: 'Server error fetching remote admin memberships.' });
    }
};

module.exports = { getAllMemberships, getMembershipById, createMembership, updateMembership, deleteMembership, getAllTiers, updateTier, syncFromRender, getRemoteMobileMemberships, getRemoteAdminMemberships };