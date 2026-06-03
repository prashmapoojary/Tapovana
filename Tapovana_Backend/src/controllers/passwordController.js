const bcrypt = require('bcryptjs');
const { query, getClient } = require('../config/db');
const { sendPasswordChangedEmail } = require('../services/emailService');
require('dotenv').config();

// Set password via token from invite email link
const setPasswordViaToken = async (req, res) => {
    const { token, password, confirm_password } = req.body;

    if (!token || !password || !confirm_password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const credResult = await client.query(
            `SELECT lc.id AS cred_id, lc.member_id, tm.email, tm.first_name
       FROM login_credentials lc
       JOIN team_members tm ON tm.id = lc.member_id
       WHERE lc.reset_token = $1
         AND lc.reset_token_expiry > NOW()`,
            [token]
        );

        if (!credResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
        }

        const { cred_id, member_id, email, first_name } = credResult.rows[0];
        const hash = await bcrypt.hash(password, 12);

        await client.query(
            `UPDATE login_credentials
       SET password_hash = $1, temp_password_hash = NULL,
           must_change = FALSE, reset_token = NULL, reset_token_expiry = NULL,
           updated_at = NOW()
       WHERE id = $2`,
            [hash, cred_id]
        );

        await client.query(
            `UPDATE team_members SET status = 'active', updated_at = NOW() WHERE id = $1`,
            [member_id]
        );

        await client.query('COMMIT');

        sendPasswordChangedEmail({ to: email, firstName: first_name }).catch(console.error);

        return res.json({ success: true, message: 'Password set successfully. You may now log in.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('setPasswordViaToken error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

// Change password from dashboard (logged in user)
const changePassword = async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const memberId = req.user.id;

    if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (new_password !== confirm_password) {
        return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }
    if (new_password.length < 8) {
        return res.status(400).json({ success: false, message: 'Password must be at least 8 characters.' });
    }

    try {
        const credResult = await query(
            'SELECT id, password_hash, temp_password_hash FROM login_credentials WHERE member_id = $1',
            [memberId]
        );

        if (!credResult.rows.length) {
            return res.status(404).json({ success: false, message: 'Credentials not found.' });
        }

        const cred = credResult.rows[0];
        const currentHash = cred.password_hash || cred.temp_password_hash;
        const valid = await bcrypt.compare(current_password, currentHash);

        if (!valid) {
            return res.status(401).json({ success: false, message: 'Current password is incorrect.' });
        }

        const newHash = await bcrypt.hash(new_password, 12);
        await query(
            `UPDATE login_credentials
       SET password_hash = $1, temp_password_hash = NULL, must_change = FALSE, updated_at = NOW()
       WHERE id = $2`,
            [newHash, cred.id]
        );

        sendPasswordChangedEmail({ to: req.user.email, firstName: req.user.first_name }).catch(console.error);

        return res.json({ success: true, message: 'Password changed successfully.' });
    } catch (err) {
        console.error('changePassword error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// Validate reset token (before showing set-password form)
const validateResetToken = async (req, res) => {
    const { token } = req.query;
    if (!token) return res.status(400).json({ success: false, message: 'Token is required.' });

    const result = await query(
        `SELECT tm.first_name, tm.email
     FROM login_credentials lc
     JOIN team_members tm ON tm.id = lc.member_id
     WHERE lc.reset_token = $1 AND lc.reset_token_expiry > NOW()`,
        [token]
    );

    if (!result.rows.length) {
        return res.status(400).json({ success: false, valid: false, message: 'Invalid or expired link.' });
    }

    return res.json({ success: true, valid: true, first_name: result.rows[0].first_name });
};

module.exports = { setPasswordViaToken, changePassword, validateResetToken };