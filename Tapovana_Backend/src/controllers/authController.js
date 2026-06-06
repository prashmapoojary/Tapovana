const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query, getClient } = require('../config/db');
const { sendOtpEmail } = require('../services/emailService');
require('dotenv').config();

// Generate 6 digit OTP
const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Build access map from array
const buildAccessMap = (accessArray) =>
    accessArray.reduce((acc, key) => ({ ...acc, [key]: true }), {});

// STEP 1 — Check email + password, then send OTP
const loginPassword = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    try {
        const result = await query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.status,
              lc.password_hash, lc.temp_password_hash, lc.must_change,
              r.name AS role
       FROM team_members tm
       JOIN login_credentials lc ON lc.member_id = tm.id
       JOIN roles r ON r.id = tm.role_id
       WHERE LOWER(tm.email) = LOWER($1)`,
            [email]
        );

        if (!result.rows.length) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        const member = result.rows[0];

        if (member.status === 'inactive') {
            return res.status(403).json({ success: false, message: 'Account is inactive. Contact admin.' });
        }

        const hashToCheck = member.password_hash || member.temp_password_hash;
        if (!hashToCheck) {
            return res.status(401).json({ success: false, message: 'Password not set. Use the invite link.' });
        }

        const valid = await bcrypt.compare(password, hashToCheck);
        if (!valid) {
            return res.status(401).json({ success: false, message: 'Invalid credentials.' });
        }

        // Invalidate old OTPs
        await query(
            `UPDATE otp_verification SET used = TRUE
       WHERE member_id = $1 AND otp_type = 'login' AND used = FALSE`,
            [member.id]
        );

        // Generate new OTP
        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || '10', 10) * 60000);
        const otpHash = await bcrypt.hash(otp, 10);

        await query(
            `INSERT INTO otp_verification (member_id, otp_code, otp_type, expires_at)
       VALUES ($1, $2, 'login', $3)`,
            [member.id, otpHash, expiresAt]
        );

        // Send OTP email
        await sendOtpEmail({ to: member.email, firstName: member.first_name, otp });

        console.log(`\n🔑 [DEVELOPMENT ONLY] Login OTP for ${member.email} is: ${otp}\n`);

        return res.json({
            success: true,
            message: 'OTP sent to your registered email.',
            must_change: member.must_change,
        });
    } catch (err) {
        console.error('loginPassword error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

// STEP 2 — Verify OTP and return JWT token
const verifyOtp = async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
        return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const client = await getClient();
    try {
        await client.query('BEGIN');

        const memberResult = await client.query(
            `SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.avatar_url, tm.status,
              r.name AS role, r.access, lc.must_change
       FROM team_members tm
       JOIN roles r ON r.id = tm.role_id
       JOIN login_credentials lc ON lc.member_id = tm.id
       WHERE LOWER(tm.email) = LOWER($1)`,
            [email]
        );

        if (!memberResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(401).json({ success: false, message: 'Invalid request.' });
        }

        const member = memberResult.rows[0];

        // Get latest valid OTP
        const otpResult = await client.query(
            `SELECT id, otp_code, attempts
       FROM otp_verification
       WHERE member_id = $1 AND otp_type = 'login'
         AND used = FALSE AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
            [member.id]
        );

        if (!otpResult.rows.length) {
            await client.query('ROLLBACK');
            return res.status(401).json({ success: false, message: 'OTP expired. Please login again.' });
        }

        const otpRow = otpResult.rows[0];
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || '5', 10);

        if (otpRow.attempts >= maxAttempts) {
            await client.query('UPDATE otp_verification SET used = TRUE WHERE id = $1', [otpRow.id]);
            await client.query('COMMIT');
            return res.status(429).json({ success: false, message: 'Too many attempts. Please login again.' });
        }

        const otpValid = await bcrypt.compare(otp, otpRow.otp_code);
        if (!otpValid) {
            await client.query(
                'UPDATE otp_verification SET attempts = attempts + 1 WHERE id = $1',
                [otpRow.id]
            );
            await client.query('COMMIT');
            return res.status(401).json({ success: false, message: 'Invalid OTP.' });
        }

        // Mark OTP as used
        await client.query('UPDATE otp_verification SET used = TRUE WHERE id = $1', [otpRow.id]);
        await client.query(
            'UPDATE login_credentials SET last_login = NOW() WHERE member_id = $1',
            [member.id]
        );

        const accessMap = buildAccessMap(member.access);

        // Sign JWT token
        const token = jwt.sign(
            { sub: member.id, role: member.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
        );

        await client.query('COMMIT');

        return res.json({
            success: true,
            message: 'Login successful.',
            token,
            must_change: member.must_change,
            user: {
                user_id: member.id,
                first_name: member.first_name,
                last_name: member.last_name,
                email: member.email,
                role: member.role,
                avatar_url: member.avatar_url,
            },
            access: accessMap,
        });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('verifyOtp error:', err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    } finally {
        client.release();
    }
};

module.exports = { loginPassword, verifyOtp };