const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const UPLOADS_DIR = path.join(__dirname, '../../uploads');

const ensureUploadsDir = () => {
    if (!fs.existsSync(UPLOADS_DIR)) {
        fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
};

const normalizeDbStatus = (status) => {
    if (!status) return null;
    const s = String(status).toUpperCase();
    if (s === 'ACTIVE') return 'active';
    if (s === 'INACTIVE') return 'inactive';
    if (s === 'PENDING') return 'pending';
    return String(status).toLowerCase();
};

// ─── Handle profile photo save ────────────────────────────────────────────────
const handleProfilePhotoSave = (source, url, base64) => {
    const normalizedSource = source ? String(source).toLowerCase().trim() : 'default';
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';

    if (normalizedSource === 'default') {
        return { url: null, source: 'default' };
    }

    if (normalizedSource === 'local') {
        return normalizedUrl ? { url: normalizedUrl, source: 'local' } : { url: null, source: 'default' };
    }

    if (normalizedSource === 'external') {
        if (/^https?:\/\/.+/i.test(normalizedUrl)) {
            return { url: normalizedUrl, source: 'external' };
        }
        return { url: null, source: 'default' };
    }

    if (normalizedSource === 'upload' && base64) {
        const matches = base64.match(/^data:([A-Za-z-+/]+);base64,(.+)$/);
        if (matches && matches.length === 3) {
            const mime = matches[1];
            const extMap = {
                'image/jpeg': '.jpg',
                'image/jpg': '.jpg',
                'image/png': '.png',
                'image/gif': '.gif',
                'image/webp': '.webp',
                'image/svg+xml': '.svg'
            };
            const ext = extMap[mime] || '.png';
            const buffer = Buffer.from(matches[2], 'base64');
            const filename = `${uuidv4()}${ext}`;

            ensureUploadsDir();
            fs.writeFileSync(path.join(UPLOADS_DIR, filename), buffer);

            return { url: `/uploads/${filename}`, source: 'upload' };
        }
    }

    if (normalizedSource === 'upload' && normalizedUrl) {
        if (normalizedUrl.startsWith('/uploads/')) {
            return { url: normalizedUrl, source: 'upload' };
        }
        if (normalizedUrl.startsWith('uploads/')) {
            return { url: `/${normalizedUrl}`, source: 'upload' };
        }
        if (/^https?:\/\/.+/i.test(normalizedUrl)) {
            return { url: normalizedUrl, source: 'upload' };
        }
        return { url: `/uploads/${path.basename(normalizedUrl)}`, source: 'upload' };
    }

    return { url: null, source: 'default' };
};

// ─── Generate temp password ───────────────────────────────────────────────────
const generateTempPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

// ─── GET all team members (Postman) ──────────────────────────────────────────
const getTeam = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
                    tm.avatar_url, tm.status, tm.created_at,
                    tm.profile_photo_url, tm.profile_photo_source,
                    tm.availability_status, tm.allocation_details,
                    r.name AS role, r.label AS role_label,
                    lc.last_login, lc.must_change
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             LEFT JOIN login_credentials lc ON lc.member_id = tm.id
             ORDER BY tm.created_at DESC`
        );
        return res.json({ success: true, team: result.rows });
    } catch (err) {
        console.error('getTeam error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── GET single team member ───────────────────────────────────────────────────
const getTeamMember = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
                    tm.avatar_url, tm.status, tm.created_at,
                    tm.profile_photo_url, tm.profile_photo_source,
                    tm.availability_status, tm.allocation_details,
                    r.name AS role, r.label AS role_label, r.access
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             WHERE tm.id = $1`,
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, member: result.rows[0] });
    } catch (err) {
        console.error('getTeamMember error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── ADD team member (Postman) ────────────────────────────────────────────────
const addTeamMember = async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        role,
        profile_photo_source,
        profile_photo_url,
        profile_photo_base64
    } = req.body;

    if (!first_name || !last_name || !email || !role) {
        return res.status(400).json({
            success: false,
            message: 'first_name, last_name, email, and role are required.'
        });
    }

    const ALLOWED_ROLES = ['SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
            success: false,
            message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`
        });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        if (existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
        if (!roleResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid role.' });
        }

        const roleId = roleResult.rows[0].id;
        const photoResult = handleProfilePhotoSave(
            profile_photo_source,
            profile_photo_url,
            profile_photo_base64
        );

        const memberResult = await client.query(
            `INSERT INTO team_members (
                first_name, last_name, email, phone, role_id, status, created_by,
                profile_photo_url, profile_photo_source, avatar_url
             )
             VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7, $8, $9)
             RETURNING id`,
            [
                first_name.trim(),
                last_name.trim(),
                email.toLowerCase().trim(),
                phone?.trim() || null,
                roleId,
                req.user.id,
                photoResult.url,
                photoResult.source,
                photoResult.url
            ]
        );

        const memberId = memberResult.rows[0].id;
        const tempPassword = generateTempPassword();
        const tempHash = await bcrypt.hash(tempPassword, 12);
        const resetToken = uuidv4().replace(/-/g, '');
        const tokenExpiry = new Date(
            Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRES_HOURS || '48', 10) * 3600000
        );

        await client.query(
            `INSERT INTO login_credentials (
                member_id, temp_password_hash, reset_token, reset_token_expiry, must_change
             )
             VALUES ($1, $2, $3, $4, TRUE)`,
            [memberId, tempHash, resetToken, tokenExpiry]
        );

        await client.query('COMMIT');

        const resetUrl = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
        sendWelcomeEmail({ to: email, firstName: first_name, tempPassword, resetUrl }).catch(console.error);

        return res.status(201).json({
            success: true,
            message: 'Team member added. Invite email sent.',
            member_id: memberId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('addTeamMember error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

// ─── UPDATE team member (Postman) ─────────────────────────────────────────────
const updateTeamMember = async (req, res) => {
    const {
        first_name,
        last_name,
        phone,
        role,
        status,
        avatar_url,
        profile_photo_source,
        profile_photo_url,
        profile_photo_base64,
        availability_status,
        allocation_details
    } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (first_name !== undefined) {
            fields.push(`first_name = $${idx++}`);
            values.push(first_name?.trim() || null);
        }
        if (last_name !== undefined) {
            fields.push(`last_name = $${idx++}`);
            values.push(last_name?.trim() || null);
        }
        if (phone !== undefined) {
            fields.push(`phone = $${idx++}`);
            values.push(phone?.trim() || null);
        }
        if (status !== undefined) {
            fields.push(`status = $${idx++}`);
            values.push(normalizeDbStatus(status));
        }
        if (avatar_url !== undefined) {
            fields.push(`avatar_url = $${idx++}`);
            values.push(avatar_url?.trim() || null);
        }

        if (profile_photo_source !== undefined) {
            const photoResult = handleProfilePhotoSave(
                profile_photo_source,
                profile_photo_url,
                profile_photo_base64
            );
            fields.push(`profile_photo_source = $${idx++}`);
            values.push(photoResult.source);
            fields.push(`profile_photo_url = $${idx++}`);
            values.push(photoResult.url);
            fields.push(`avatar_url = $${idx++}`);
            values.push(photoResult.url);
        }

        if (availability_status !== undefined) {
            fields.push(`availability_status = $${idx++}`);
            values.push(availability_status);
        }

        if (allocation_details !== undefined) {
            fields.push(`allocation_details = $${idx++}`);
            values.push(allocation_details ? JSON.stringify(allocation_details) : null);
        }

        if (role !== undefined) {
            const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
            if (!roleResult.rows.length) {
                return res.status(400).json({ success: false, message: 'Invalid role.' });
            }
            fields.push(`role_id = $${idx++}`);
            values.push(roleResult.rows[0].id);
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(req.params.id);
        const result = await query(
            `UPDATE team_members
             SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id = $${idx}
             RETURNING id`,
            values
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: 'Team member updated.' });
    } catch (err) {
        console.error('updateTeamMember error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── DELETE team member (Postman - soft delete) ───────────────────────────────
const deleteTeamMember = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
        }

        const result = await query(
            `UPDATE team_members
             SET status = 'inactive', updated_at = NOW()
             WHERE id = $1
             RETURNING id`,
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: 'Team member deactivated.' });
    } catch (err) {
        console.error('deleteTeamMember error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── RESEND invite ────────────────────────────────────────────────────────────
const resendInvite = async (req, res) => {
    const client = await getClient();
    try {
        await client.query('BEGIN');

        const result = await client.query(
            `SELECT tm.first_name, tm.email, lc.id AS cred_id
             FROM team_members tm
             JOIN login_credentials lc ON lc.member_id = tm.id
             WHERE tm.id = $1 AND tm.status = 'pending'`,
            [req.params.id]
        );

        if (!result.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Pending member not found.' });
        }

        const { first_name, email, cred_id } = result.rows[0];
        const tempPassword = generateTempPassword();
        const tempHash = await bcrypt.hash(tempPassword, 12);
        const resetToken = uuidv4().replace(/-/g, '');
        const tokenExpiry = new Date(Date.now() + 48 * 3600000);

        await client.query(
            `UPDATE login_credentials
             SET temp_password_hash = $1, reset_token = $2, reset_token_expiry = $3, updated_at = NOW()
             WHERE id = $4`,
            [tempHash, resetToken, tokenExpiry, cred_id]
        );

        await client.query('COMMIT');

        const resetUrl = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
        sendWelcomeEmail({ to: email, firstName: first_name, tempPassword, resetUrl }).catch(console.error);

        return res.json({ success: true, message: 'Invite resent.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('resendInvite error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

// ─── GET roles ────────────────────────────────────────────────────────────────
const getRoles = async (req, res) => {
    try {
        const result = await query('SELECT id, name, label, access FROM roles ORDER BY id');
        return res.json({ success: true, roles: result.rows });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── FRONTEND: GET all team members ──────────────────────────────────────────
const getTeamFrontend = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
                    tm.avatar_url, tm.status, tm.specialization, tm.created_at,
                    tm.profile_photo_url, tm.profile_photo_source,
                    tm.availability_status, tm.allocation_details,
                    r.name AS role, r.label AS role_label,
                    lc.last_login AS last_login_at, lc.must_change
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             LEFT JOIN login_credentials lc ON lc.member_id = tm.id
             ORDER BY tm.created_at DESC`
        );
        return res.json({ success: true, users: result.rows });
    } catch (err) {
        console.error('getTeamFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── FRONTEND: ADD team member ────────────────────────────────────────────────
const addTeamMemberFrontend = async (req, res) => {
    const {
        first_name,
        last_name,
        email,
        phone,
        role,
        specialization,
        send_invite_email,
        profile_photo_source,
        profile_photo_url,
        profile_photo_base64
    } = req.body;

    if (!first_name || !last_name || !email || !role) {
        return res.status(400).json({
            success: false,
            message: 'first_name, last_name, email, and role are required.'
        });
    }

    const ALLOWED_ROLES = ['SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({
            success: false,
            message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}`
        });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)',
            [email]
        );
        if (existing.rows.length) {
            await client.query('ROLLBACK');
            return res.status(409).json({ success: false, message: 'Email already registered.' });
        }

        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [role]);
        if (!roleResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid role.' });
        }

        const roleId = roleResult.rows[0].id;
        const photoResult = handleProfilePhotoSave(
            profile_photo_source,
            profile_photo_url,
            profile_photo_base64
        );

        const memberResult = await client.query(
            `INSERT INTO team_members (
                first_name, last_name, email, phone, role_id, specialization,
                status, created_by, profile_photo_url, profile_photo_source, avatar_url
             )
             VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $8, $9, $10)
             RETURNING id`,
            [
                first_name.trim(),
                last_name.trim(),
                email.toLowerCase().trim(),
                phone?.trim() || null,
                roleId,
                specialization?.trim() || null,
                req.user.id,
                photoResult.url,
                photoResult.source,
                photoResult.url
            ]
        );

        const memberId = memberResult.rows[0].id;
        const tempPassword = generateTempPassword();
        const tempHash = await bcrypt.hash(tempPassword, 12);
        const resetToken = uuidv4().replace(/-/g, '');
        const tokenExpiry = new Date(Date.now() + 48 * 3600000);

        await client.query(
            `INSERT INTO login_credentials (
                member_id, temp_password_hash, reset_token, reset_token_expiry, must_change
             )
             VALUES ($1, $2, $3, $4, TRUE)`,
            [memberId, tempHash, resetToken, tokenExpiry]
        );

        await client.query('COMMIT');

        if (send_invite_email !== false) {
            const resetUrl = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
            sendWelcomeEmail({ to: email, firstName: first_name, tempPassword, resetUrl }).catch(console.error);
        }

        return res.status(201).json({
            success: true,
            message: 'Team member added. Invite email sent.',
            user_id: memberId
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('addTeamMemberFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

// ─── FRONTEND: UPDATE team member ─────────────────────────────────────────────
const updateTeamMemberFrontend = async (req, res) => {
    const {
        first_name,
        last_name,
        phone,
        role,
        status,
        specialization,
        avatar_url,
        profile_photo_source,
        profile_photo_url,
        profile_photo_base64,
        availability_status,
        allocation_details
    } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (first_name !== undefined) {
            fields.push(`first_name = $${idx++}`);
            values.push(first_name?.trim() || null);
        }
        if (last_name !== undefined) {
            fields.push(`last_name = $${idx++}`);
            values.push(last_name?.trim() || null);
        }
        if (phone !== undefined) {
            fields.push(`phone = $${idx++}`);
            values.push(phone?.trim() || null);
        }
        if (specialization !== undefined) {
            fields.push(`specialization = $${idx++}`);
            values.push(specialization?.trim() || null);
        }
        if (avatar_url !== undefined) {
            fields.push(`avatar_url = $${idx++}`);
            values.push(avatar_url?.trim() || null);
        }

        if (profile_photo_source !== undefined) {
            const photoResult = handleProfilePhotoSave(
                profile_photo_source,
                profile_photo_url,
                profile_photo_base64
            );
            fields.push(`profile_photo_source = $${idx++}`);
            values.push(photoResult.source);
            fields.push(`profile_photo_url = $${idx++}`);
            values.push(photoResult.url);
            fields.push(`avatar_url = $${idx++}`);
            values.push(photoResult.url);
        }

        if (availability_status !== undefined) {
            fields.push(`availability_status = $${idx++}`);
            values.push(availability_status);
        }

        if (allocation_details !== undefined) {
            fields.push(`allocation_details = $${idx++}`);
            values.push(allocation_details ? JSON.stringify(allocation_details) : null);
        }

        if (status !== undefined) {
            fields.push(`status = $${idx++}`);
            values.push(normalizeDbStatus(status));
        }

        if (role !== undefined) {
            const roleResult = await query('SELECT id FROM roles WHERE name = $1', [role]);
            if (!roleResult.rows.length) {
                return res.status(400).json({ success: false, message: 'Invalid role.' });
            }
            fields.push(`role_id = $${idx++}`);
            values.push(roleResult.rows[0].id);
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(req.params.id);
        const result = await query(
            `UPDATE team_members
             SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id = $${idx}
             RETURNING id`,
            values
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: 'Team member updated.' });
    } catch (err) {
        console.error('updateTeamMemberFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── FRONTEND: TOGGLE status ──────────────────────────────────────────────────
const toggleStatusFrontend = async (req, res) => {
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: 'Status must be ACTIVE or INACTIVE.'
        });
    }

    try {
        const result = await query(
            `UPDATE team_members
             SET status = $1, updated_at = NOW()
             WHERE id = $2
             RETURNING id`,
            [normalizeDbStatus(status), req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: `Status updated to ${status}.` });
    } catch (err) {
        console.error('toggleStatusFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── FRONTEND: UPDATE self profile ────────────────────────────────────────────
const updateSelfProfile = async (req, res) => {
    const {
        first_name,
        last_name,
        phone,
        profile_photo_source,
        profile_photo_url,
        profile_photo_base64
    } = req.body;

    const userId = req.user.id;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (first_name !== undefined) {
            fields.push(`first_name = $${idx++}`);
            values.push(first_name?.trim() || null);
        }
        if (last_name !== undefined) {
            fields.push(`last_name = $${idx++}`);
            values.push(last_name?.trim() || null);
        }
        if (phone !== undefined) {
            fields.push(`phone = $${idx++}`);
            values.push(phone?.trim() || null);
        }

        if (profile_photo_source !== undefined) {
            const photoResult = handleProfilePhotoSave(
                profile_photo_source,
                profile_photo_url,
                profile_photo_base64
            );
            fields.push(`profile_photo_source = $${idx++}`);
            values.push(photoResult.source);
            fields.push(`profile_photo_url = $${idx++}`);
            values.push(photoResult.url);
            fields.push(`avatar_url = $${idx++}`);
            values.push(photoResult.url);
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No fields to update.' });
        }

        values.push(userId);
        const result = await query(
            `UPDATE team_members
             SET ${fields.join(', ')}, updated_at = NOW()
             WHERE id = $${idx}
             RETURNING id, first_name, last_name, email, phone, role_id,
                       status, profile_photo_url, profile_photo_source, avatar_url`,
            values
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found.' });
        }

        const member = result.rows[0];
        const roleResult = await query('SELECT name FROM roles WHERE id = $1', [member.role_id]);

        return res.json({
            success: true,
            message: 'Profile updated successfully.',
            user: {
                user_id: member.id,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                phone: member.phone,
                role: roleResult.rows[0]?.name || '',
                status: member.status,
                profile_photo_url: member.profile_photo_url,
                profile_photo_source: member.profile_photo_source,
                avatar_url: member.avatar_url
            }
        });
    } catch (err) {
        console.error('updateSelfProfile error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── FRONTEND: DELETE team member (hard delete) ───────────────────────────────
const deleteTeamMemberFrontend = async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'Cannot delete your own account.' });
        }

        const result = await query(
            `DELETE FROM team_members WHERE id = $1 RETURNING id`,
            [req.params.id]
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: 'Team member deleted successfully.' });
    } catch (err) {
        console.error('deleteTeamMemberFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const getTeamMemberAllocations = async (req, res) => {
    try {
        const userId = req.params.id;
        
        // Ensure user exists
        const userRes = await query(`SELECT id FROM team_members WHERE id = $1`, [userId]);
        if (!userRes.rows.length) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        
        // Fetch all allocations from unified table
        const allocationsRes = await query(
            `SELECT a.* FROM allocations a
             LEFT JOIN deleted_booking_ids d ON d.booking_id = CASE WHEN a.session_id ~ '^[0-9]+$' THEN CAST(a.session_id AS INTEGER) ELSE NULL END
             WHERE a.staff_id = $1 AND d.booking_id IS NULL
             ORDER BY a.start_date DESC`,
            [userId]
        );

        const workshops = [];
        const services = [];
        const vedic_programs = [];

        for (const a of allocationsRes.rows) {
            const item = {
                id: a.session_id,
                sessionTitle: a.session_title,
                startDate: a.start_date,
                endDate: a.end_date,
                type: a.type,
                status: a.status === 'active' ? 'Ongoing' : 'Completed'
            };

            if (a.type === 'workshop') {
                item.status = a.status === 'active' ? 'In Progress' : 'Completed';
                workshops.push(item);
            } else if (a.type === 'service') {
                item.status = a.status === 'active' ? 'Active' : 'Completed';
                services.push(item);
            } else if (a.type === 'vedic_program') {
                vedic_programs.push(item);
            }
        }
        
        return res.json({ 
            success: true, 
            allocations: { workshops, services, vedic_programs } 
        });

    } catch (err) {
        console.error('getTeamMemberAllocations error:', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

const getAllAllocations = async (req, res) => {
    try {
        const result = await query(
            `SELECT a.*, tm.first_name, tm.last_name, r.name AS role
             FROM allocations a
             JOIN team_members tm ON tm.id = a.staff_id
             JOIN roles r ON r.id = tm.role_id
             LEFT JOIN deleted_booking_ids d ON d.booking_id = CASE WHEN a.session_id ~ '^[0-9]+$' THEN CAST(a.session_id AS INTEGER) ELSE NULL END
             WHERE d.booking_id IS NULL
             ORDER BY a.start_date DESC`
        );

        const allocations = result.rows.map(a => ({
            id: a.id,
            type: a.type,
            staffId: a.staff_id,
            staffName: `${a.first_name || ''} ${a.last_name || ''}`.trim(),
            staffRole: a.role,
            sessionTitle: a.session_title,
            sessionId: a.session_id,
            startDate: a.start_date,
            bookingTime: a.booking_time,
            endDate: a.end_date,
            status: a.status === 'active' ? 'active' : 'expired',
            createdAt: a.created_at
        }));

        return res.json({ success: true, allocations });
    } catch (err) {
        console.error('getAllAllocations error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// ─── Update allocation status only (accessible to any authenticated user) ────
const updateAllocationStatus = async (req, res) => {
    const { availability_status, allocation_details } = req.body;
    const targetId = req.params.id;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (availability_status !== undefined) {
            fields.push(`availability_status = $${idx++}`);
            values.push(availability_status);
        }
        if (allocation_details !== undefined) {
            fields.push(`allocation_details = $${idx++}`);
            values.push(allocation_details ? JSON.stringify(allocation_details) : null);
        }

        if (!fields.length) {
            return res.status(400).json({ success: false, message: 'No allocation fields to update.' });
        }

        values.push(targetId);
        const result = await query(
            `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW() WHERE id = $${idx} RETURNING id`,
            values
        );

        if (!result.rows.length) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        return res.json({ success: true, message: 'Allocation status updated.' });
    } catch (err) {
        console.error('updateAllocationStatus error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const getPublicSpecialists = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
                    tm.avatar_url, tm.specialization,
                    r.name AS role, r.label AS role_label
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             WHERE tm.status = 'active' AND LOWER(r.name) IN ('doctor', 'therapist')
             ORDER BY tm.first_name ASC`
        );
        return res.json({ success: true, specialists: result.rows });
    } catch (err) {
        console.error('getPublicSpecialists error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

const getPublicTeam = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
                    tm.avatar_url, tm.specialization, tm.status,
                    r.name AS role, r.label AS role_label
             FROM team_members tm
             JOIN roles r ON r.id = tm.role_id
             WHERE tm.status = 'active'
             ORDER BY tm.first_name ASC`
        );
        return res.json({ success: true, team: result.rows });
    } catch (err) {
        console.error('getPublicTeam error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

module.exports = {
    getTeam,
    getTeamMember,
    getAllAllocations,
    addTeamMember,
    updateTeamMember,
    deleteTeamMember,
    resendInvite,
    getRoles,
    getTeamFrontend,
    addTeamMemberFrontend,
    updateTeamMemberFrontend,
    toggleStatusFrontend,
    getTeamMemberAllocations,
    deleteTeamMemberFrontend,
    updateSelfProfile,
    updateAllocationStatus,
    getPublicSpecialists,
    getPublicTeam,
};