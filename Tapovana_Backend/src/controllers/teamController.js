const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/db');
const { sendWelcomeEmail } = require('../services/emailService');
require('dotenv').config();

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
    const { first_name, last_name, email, phone, role } = req.body;

    if (!first_name || !last_name || !email || !role) {
        return res.status(400).json({ success: false, message: 'first_name, last_name, email, and role are required.' });
    }

    const ALLOWED_ROLES = ['SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)', [email]
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

        const memberResult = await client.query(
            `INSERT INTO team_members (first_name, last_name, email, phone, role_id, status, created_by)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING id`,
            [first_name, last_name, email.toLowerCase(), phone || null, roleId, req.user.id]
        );
        const memberId = memberResult.rows[0].id;

        const tempPassword = generateTempPassword();
        const tempHash = await bcrypt.hash(tempPassword, 12);
        const resetToken = uuidv4().replace(/-/g, '');
        const tokenExpiry = new Date(Date.now() + parseInt(process.env.RESET_TOKEN_EXPIRES_HOURS || '48', 10) * 3600000);

        await client.query(
            `INSERT INTO login_credentials (member_id, temp_password_hash, reset_token, reset_token_expiry, must_change)
       VALUES ($1, $2, $3, $4, TRUE)`,
            [memberId, tempHash, resetToken, tokenExpiry]
        );

        await client.query('COMMIT');

        const resetUrl = `${process.env.FRONTEND_URL}/set-password?token=${resetToken}`;
        sendWelcomeEmail({ to: email, firstName: first_name, tempPassword, resetUrl }).catch(console.error);

        return res.status(201).json({
            success: true,
            message: 'Team member added. Invite email sent.',
            member_id: memberId,
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
    const { first_name, last_name, phone, role, status, avatar_url } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (first_name) { fields.push(`first_name = $${idx++}`); values.push(first_name); }
        if (last_name) { fields.push(`last_name = $${idx++}`); values.push(last_name); }
        if (phone) { fields.push(`phone = $${idx++}`); values.push(phone); }
        if (status) { fields.push(`status = $${idx++}`); values.push(status); }
        if (avatar_url) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

        if (role) {
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
            `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING id`,
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
            `UPDATE team_members SET status = 'inactive', updated_at = NOW()
       WHERE id = $1 RETURNING id`,
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

// ─── FRONTEND ROUTES (/api/teams/users) ──────────────────────────────────────

const getTeamFrontend = async (req, res) => {
    try {
        const result = await query(
            `SELECT tm.id AS user_id, tm.first_name, tm.last_name, tm.email, tm.phone,
              tm.avatar_url, tm.status, tm.specialization, tm.created_at,
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

const addTeamMemberFrontend = async (req, res) => {
    const { first_name, last_name, email, phone, role, specialization,
        send_invite_email } = req.body;

    if (!first_name || !last_name || !email || !role) {
        return res.status(400).json({ success: false, message: 'first_name, last_name, email, and role are required.' });
    }

    const ALLOWED_ROLES = ['SUPER_ADMIN', 'CO_ADMIN', 'DOCTOR', 'THERAPIST'];
    if (!ALLOWED_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: `Role must be one of: ${ALLOWED_ROLES.join(', ')}` });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const existing = await client.query(
            'SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)', [email]
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

        const memberResult = await client.query(
            `INSERT INTO team_members (first_name, last_name, email, phone, role_id, specialization, status, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
       RETURNING id`,
            [first_name, last_name, email.toLowerCase(), phone || null,
                roleId, specialization || null, req.user.id]
        );
        const memberId = memberResult.rows[0].id;

        const tempPassword = generateTempPassword();
        const tempHash = await bcrypt.hash(tempPassword, 12);
        const resetToken = uuidv4().replace(/-/g, '');
        const tokenExpiry = new Date(Date.now() + 48 * 3600000);

        await client.query(
            `INSERT INTO login_credentials (member_id, temp_password_hash, reset_token, reset_token_expiry, must_change)
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
            user_id: memberId,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('addTeamMemberFrontend error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

const updateTeamMemberFrontend = async (req, res) => {
    const { first_name, last_name, phone, role, status, specialization, avatar_url } = req.body;

    try {
        const fields = [];
        const values = [];
        let idx = 1;

        if (first_name) { fields.push(`first_name = $${idx++}`); values.push(first_name); }
        if (last_name) { fields.push(`last_name = $${idx++}`); values.push(last_name); }
        if (phone) { fields.push(`phone = $${idx++}`); values.push(phone); }
        if (specialization !== undefined) { fields.push(`specialization = $${idx++}`); values.push(specialization); }
        if (avatar_url) { fields.push(`avatar_url = $${idx++}`); values.push(avatar_url); }

        if (status) {
            const dbStatus = status === 'ACTIVE' ? 'active' : 'inactive';
            fields.push(`status = $${idx++}`);
            values.push(dbStatus);
        }

        if (role) {
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
            `UPDATE team_members SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} RETURNING id`,
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

const toggleStatusFrontend = async (req, res) => {
    const { status } = req.body;

    if (!status || !['ACTIVE', 'INACTIVE'].includes(status)) {
        return res.status(400).json({ success: false, message: 'Status must be ACTIVE or INACTIVE.' });
    }

    try {
        const dbStatus = status === 'ACTIVE' ? 'active' : 'inactive';
        const result = await query(
            `UPDATE team_members SET status = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id`,
            [dbStatus, req.params.id]
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

// ─── DELETE team member (Frontend - hard delete) ──────────────────────────────
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

module.exports = {
    getTeam, getTeamMember, addTeamMember, updateTeamMember,
    deleteTeamMember, resendInvite, getRoles,
    getTeamFrontend, addTeamMemberFrontend,
    updateTeamMemberFrontend, toggleStatusFrontend,
    deleteTeamMemberFrontend,
};