const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, getClient } = require('../config/db');
const { sendPasswordChangedEmail, sendResetOtpEmail } = require('../services/emailService');
require('dotenv').config();

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

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

// Forgot Password — request reset OTP
const forgotPassword = async (req, res) => {
    const { email } = req.body;
    if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        // Query user in team_members
        const memberResult = await client.query(
            `SELECT id, first_name, status FROM team_members WHERE LOWER(email) = LOWER($1)`,
            [email]
        );

        if (!memberResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'No account found with this email.' });
        }

        const member = memberResult.rows[0];
        if (member.status === 'inactive') {
            await client.query('ROLLBACK');
            return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
        }

        // Invalidate old password reset OTPs
        await client.query(
            `UPDATE otp_verification SET used = TRUE
             WHERE member_id = $1 AND otp_type = 'password_reset' AND used = FALSE`,
            [member.id]
        );

        // Generate 6-digit OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60000);
        const otpHash = await bcrypt.hash(otp, 10);

        // Insert OTP into otp_verification
        await client.query(
            `INSERT INTO otp_verification (member_id, otp_code, otp_type, expires_at)
             VALUES ($1, $2, 'password_reset', $3)`,
            [member.id, otpHash, expiresAt]
        );

        // Generate reset token (30-minute expiry)
        const resetToken = uuidv4().replace(/-/g, '');
        const resetExpiry = new Date(Date.now() + 30 * 60 * 1000);

        // Update login_credentials with reset token
        await client.query(
            `UPDATE login_credentials
             SET reset_token = $1, reset_token_expiry = $2, updated_at = NOW()
             WHERE member_id = $3`,
            [resetToken, resetExpiry, member.id]
        );

        await client.query('COMMIT');

        // Send OTP email
        await sendResetOtpEmail({ to: email, firstName: member.first_name, otp });

        console.log(`\n🔑 [DEVELOPMENT ONLY] Password Reset OTP for ${email} is: ${otp}\n`);

        return res.json({
            success: true,
            message: 'Password reset OTP sent successfully.',
            token: resetToken
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('forgotPassword error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

// Reset Password — verify OTP and reset
const resetPassword = async (req, res) => {
    const { token, otp, password, confirm_password } = req.body;

    if (!token || !otp || !password || !confirm_password) {
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

        // Check reset token
        const credResult = await client.query(
            `SELECT lc.id AS cred_id, lc.member_id, tm.email, tm.first_name
             FROM login_credentials lc
             JOIN team_members tm ON tm.id = lc.member_id
             WHERE lc.reset_token = $1 AND lc.reset_token_expiry > NOW()`,
            [token]
        );

        if (!credResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Invalid or expired reset token.' });
        }

        const { cred_id, member_id, email, first_name } = credResult.rows[0];

        // Retrieve latest active 'password_reset' OTP
        const otpResult = await client.query(
            `SELECT id, otp_code, attempts
             FROM otp_verification
             WHERE member_id = $1 AND otp_type = 'password_reset'
               AND used = FALSE AND expires_at > NOW()
             ORDER BY created_at DESC
             LIMIT 1`,
            [member_id]
        );

        if (!otpResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'OTP expired. Please request a new one.' });
        }

        const otpRow = otpResult.rows[0];
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

        if (otpRow.attempts >= maxAttempts) {
            await client.query('UPDATE otp_verification SET used = TRUE WHERE id = $1', [otpRow.id]);
            await client.query('COMMIT');
            return res.status(429).json({ success: false, message: 'Too many OTP attempts. Please try again.' });
        }

        const otpValid = await bcrypt.compare(otp, otpRow.otp_code);
        if (!otpValid) {
            await client.query(
                'UPDATE otp_verification SET attempts = attempts + 1 WHERE id = $1',
                [otpRow.id]
            );
            await client.query('COMMIT');
            return res.status(400).json({ success: false, message: 'Invalid OTP.' });
        }

        // Mark OTP as used
        await client.query('UPDATE otp_verification SET used = TRUE WHERE id = $1', [otpRow.id]);

        // Hash new password
        const passwordHash = await bcrypt.hash(password, 12);

        // Update login credentials
        await client.query(
            `UPDATE login_credentials
             SET password_hash = $1, temp_password_hash = NULL, must_change = FALSE,
                 reset_token = NULL, reset_token_expiry = NULL, updated_at = NOW()
             WHERE id = $2`,
            [passwordHash, cred_id]
        );

        // Activate user status if pending
        await client.query(
            `UPDATE team_members SET status = 'active', updated_at = NOW() WHERE id = $1`,
            [member_id]
        );

        await client.query('COMMIT');

        // Email confirmation
        sendPasswordChangedEmail({ to: email, firstName: first_name }).catch(console.error);

        return res.json({ success: true, message: 'Password reset successfully. You may now log in.' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('resetPassword error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

module.exports = {
    setPasswordViaToken,
    changePassword,
    validateResetToken,
    forgotPassword,
    resetPassword
};