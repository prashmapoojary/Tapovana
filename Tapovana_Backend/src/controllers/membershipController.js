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
    let totalSynced = 0;

    // 1. Sync from remote mobile membership API (https://tapoclg.onrender.com/api/membership)
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/membership', { signal: AbortSignal.timeout(6000) });
        if (response.ok) {
            const data = await response.json();
            const remoteMemberships = Array.isArray(data) ? data : (data.memberships || []);
            for (const m of remoteMemberships) {
                const emailVal = m.customer_email || m.email;
                if (!emailVal) continue;
                const nameVal = m.customer_name || m.name || 'Member';
                const tierMap = { 'DIAMOND PASS': 'PLATINUM', 'GOLD PASS': 'GOLD', 'SILVER PASS': 'SILVER' };
                const rawTier = m.membership_name || m.tier || 'SILVER';
                const mappedTier = tierMap[rawTier.toUpperCase()] || rawTier.toUpperCase();
                let joinVal = m.purchase_date || m.join_date || new Date().toISOString();
                const expiry = new Date(joinVal);
                expiry.setFullYear(expiry.getFullYear() + 1);
                const expiryStr = expiry.toISOString().split('T')[0];
                const picVal = m.profile_pic || m.profile_photo_url || null;

                const existing = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [emailVal.trim()]);
                if (existing.rows.length) {
                    await query(
                        'UPDATE memberships SET name = $1, tier = $2, join_date = $3, expiry_date = $4, profile_photo_url = COALESCE($5, profile_photo_url) WHERE LOWER(email) = LOWER($6)',
                        [nameVal, mappedTier, joinVal.split('T')[0], expiryStr, picVal, emailVal.trim()]
                    );
                } else {
                    await query(
                        'INSERT INTO memberships (name, email, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)',
                        [nameVal, emailVal.trim(), mappedTier, joinVal.split('T')[0], expiryStr, m.available_credits || 10, 15000, 'active', picVal]
                    );
                    totalSynced++;
                }
            }
        }
    } catch (err) {
        console.warn('syncMembershipsInternal remote membership error:', err.message);
    }

    // 2. Sync from remote mobile users API (https://tapoclg.onrender.com/api/users)
    try {
        const response = await fetch('https://tapoclg.onrender.com/api/users', { signal: AbortSignal.timeout(6000) });
        if (response.ok) {
            const data = await response.json();
            const users = Array.isArray(data) ? data : (data.users || data.memberships || []);

            for (const u of users) {
                const emailVal = u.email || u.customer_email;
                if (!emailVal) continue;
                const nameVal = u.name || u.customer_name || 'Member';
                const phoneVal = u.phone || null;
                const tierMap = { 'DIAMOND PASS': 'PLATINUM', 'GOLD PASS': 'GOLD', 'SILVER PASS': 'SILVER' };
                const rawTier = u.pass_name || u.membership_name || u.tier || 'SILVER';
                const mappedTier = tierMap[rawTier.toUpperCase()] || rawTier.toUpperCase();

                let joinVal = u.joined_date || u.purchase_date || u.join_date || new Date().toISOString();
                const expiry = new Date(joinVal);
                expiry.setFullYear(expiry.getFullYear() + 1);
                const expiryStr = expiry.toISOString().split('T')[0];
                const picVal = u.profile_image_url || u.profile_pic || u.profile_photo_url || null;

                const existing = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [emailVal.trim()]);

                if (existing.rows.length) {
                    await query(
                        'UPDATE memberships SET name = $1, phone = COALESCE($2, phone), tier = $3, join_date = $4, expiry_date = $5, profile_photo_url = COALESCE($6, profile_photo_url), status = $7 WHERE LOWER(email) = LOWER($8)',
                        [nameVal, phoneVal, mappedTier, joinVal.split('T')[0], expiryStr, picVal, u.status || 'active', emailVal.trim()]
                    );
                } else {
                    await query(
                        'INSERT INTO memberships (name, email, phone, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                        [nameVal, emailVal.trim(), phoneVal, mappedTier, joinVal.split('T')[0], expiryStr, 12, 15000, u.status || 'active', picVal]
                    );
                    totalSynced++;
                }
            }
        }
    } catch (err) {
        console.warn('syncMembershipsInternal mobile users error:', err.message);
    }

    // 2. Sync from local customers table (customers with membership tier)
    try {
        const custMembers = await query(`
            SELECT first_name, last_name, email, phone, membership_status, join_date, avatar_url, status 
            FROM customers 
            WHERE membership_status IS NOT NULL AND membership_status != 'NONE'
        `);
        for (const c of custMembers.rows) {
            if (!c.email) continue;
            const fullName = `${c.first_name || ''} ${c.last_name || ''}`.trim() || 'Member';
            const existing = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [c.email.trim()]);
            const expiry = new Date(c.join_date || Date.now());
            expiry.setFullYear(expiry.getFullYear() + 1);
            const expiryStr = expiry.toISOString().split('T')[0];

            if (existing.rows.length === 0) {
                await query(
                    'INSERT INTO memberships (name, email, phone, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
                    [fullName, c.email.trim(), c.phone, c.membership_status, c.join_date || new Date().toISOString().split('T')[0], expiryStr, 10, 24500, c.status?.toLowerCase() === 'inactive' ? 'expired' : 'active', c.avatar_url]
                );
                totalSynced++;
            }
        }
    } catch (custErr) {
        console.warn('syncMembershipsInternal customer sync error:', custErr.message);
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
        // Fire-and-forget sync in background so request is not blocked
        syncMembershipsInternal().catch(e => console.warn('bg sync error:', e.message));

        const { tier, status, page = 1, limit = 50 } = req.query;
        const conditions = [];
        const values = [];
        let idx = 1;

        if (tier && tier !== 'ALL') { conditions.push('tier = $' + idx++); values.push(tier.toUpperCase()); }
        if (status && status !== 'ALL') { conditions.push('status = $' + idx++); values.push(status.toLowerCase()); }

        const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Use DISTINCT ON to deduplicate rows by email (keep newest per email)
        const dedupeQuery = `
            SELECT DISTINCT ON (LOWER(COALESCE(email, id::text)))
                id, name, email, phone, tier, join_date, expiry_date,
                sessions, total_spent, status, profile_photo_url, created_by, created_at, updated_at
            FROM memberships
            ${whereClause}
            ORDER BY LOWER(COALESCE(email, id::text)), created_at DESC
        `;
        const deduped = await query(dedupeQuery, values);
        const total = deduped.rows.length;

        // Sort by created_at desc and paginate in JS
        const sorted = deduped.rows.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const paginatedRows = sorted.slice(offset, offset + parseInt(limit));

        const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'http';
        const host = req.headers['x-forwarded-host'] || req.headers.host;
        const localBase = `${protocol}://${host}`;
        const remoteBase = 'https://tapovana.onrender.com';

        const formattedMemberships = paginatedRows.map(row => {
            let profilePhoto = null;
            const pic = row.profile_photo_url;
            if (pic) {
                if (pic.startsWith('http')) {
                    profilePhoto = pic;
                } else if (pic.startsWith('/uploads/profile_photo-')) {
                    // Uploaded on remote render admin backend
                    profilePhoto = `${remoteBase}${pic}`;
                } else if (pic.startsWith('/uploads/') || pic.startsWith('/assets/')) {
                    // Local admin backend upload
                    profilePhoto = `${localBase}${pic}`;
                } else {
                    profilePhoto = pic;
                }
            }
            return { ...row, profilePhoto };
        });

        return res.json({
            success: true,
            count: formattedMemberships.length,
            memberships: formattedMemberships,
            pagination: { total, page: parseInt(page), limit: parseInt(limit), totalPages: Math.ceil(total / parseInt(limit)) }
        });
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
    if (!name || !name.trim()) return res.status(400).json({ success: false, message: 'Name is required.' });

    try {
        const savedImage = handleProfileImage(profile_photo_base64 || profile_photo_url);
        const expiryDate = new Date();
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const joinDate = new Date().toISOString().split('T')[0];
        const expiryStr = expiryDate.toISOString().split('T')[0];
        const emailVal = email ? email.trim().toLowerCase() : null;

        // Check if member already exists with this email
        if (emailVal) {
            const existing = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [emailVal]);
            if (existing.rows.length > 0) {
                const updated = await query(`
                    UPDATE memberships SET
                        name = $1,
                        phone = COALESCE($2, phone),
                        tier = $3,
                        status = $4,
                        sessions = COALESCE($5, sessions),
                        profile_photo_url = COALESCE($6, profile_photo_url),
                        updated_at = NOW()
                    WHERE id = $7
                    RETURNING *
                `, [name.trim(), phone || null, (tier || 'SILVER').toUpperCase(), (status || 'active').toLowerCase(), sessions || 0, savedImage, existing.rows[0].id]);
                
                return res.status(200).json({ success: true, message: 'Membership updated.', membership: enrichMembership(req, updated.rows[0]) });
            }
        }

        let createdBy = null;
        if (req.user?.id) {
            const tmCheck = await query('SELECT id FROM team_members WHERE id::text = $1', [String(req.user.id)]);
            if (tmCheck.rows.length > 0) {
                createdBy = tmCheck.rows[0].id;
            }
        }

        const result = await query(
            'INSERT INTO memberships (name, email, phone, tier, join_date, expiry_date, sessions, total_spent, status, profile_photo_url, created_by) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *',
            [name.trim(), emailVal, phone || null, (tier || 'SILVER').toUpperCase(), joinDate, expiryStr, sessions || 0, total_spent || 0, (status || 'active').toLowerCase(), savedImage, createdBy]
        );

        return res.status(201).json({ success: true, message: 'Membership created.', membership: enrichMembership(req, result.rows[0]) });
    } catch (err) {
        console.error('createMembership error:', err);
        return res.status(500).json({ success: false, message: 'Failed to create membership: ' + err.message });
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
        const response = await fetch('https://tapoclg.onrender.com/api/users', { signal: AbortSignal.timeout(6000) });
        if (response.ok) {
            const data = await response.json();
            const users = Array.isArray(data) ? data : (data.users || data.memberships || []);
            const tierMap = { 'DIAMOND PASS': 'PLATINUM', 'GOLD PASS': 'GOLD', 'SILVER PASS': 'SILVER' };

            const memberships = users.map(u => ({
                id: u.id,
                customer_name: u.name || 'Member',
                customer_email: u.email || '-',
                phone: u.phone || '-',
                membership_name: u.pass_name || 'SILVER PASS',
                tier: tierMap[u.pass_name?.toUpperCase()] || u.pass_name?.toUpperCase() || 'SILVER',
                purchase_date: u.joined_date || new Date().toISOString(),
                available_credits: 12,
                profile_pic: u.profile_image_url || null
            }));

            return res.json({ success: true, count: memberships.length, memberships });
        }

        // Fallback to local DB members
        const local = await query('SELECT * FROM memberships ORDER BY created_at DESC');
        return res.json({ success: true, memberships: local.rows });
    } catch (err) {
        console.error('getRemoteMobileMemberships error:', err.message);
        try {
            const local = await query('SELECT * FROM memberships ORDER BY created_at DESC');
            return res.json({ success: true, memberships: local.rows });
        } catch (e) {
            return res.status(500).json({ success: false, message: 'Server error fetching memberships' });
        }
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