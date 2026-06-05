const bcrypt = require("bcryptjs");
const { query, getClient } = require("../config/db");
const { sendOtpEmail, sendPasswordChangedEmail } = require("../services/emailService");
require("dotenv").config();

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const requestPasswordResetOtp = async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ success: false, message: "Email is required." });
    }

    try {
        const memberResult = await query(
            `SELECT tm.id, tm.email, tm.first_name, tm.status
       FROM team_members tm
       WHERE LOWER(tm.email) = LOWER($1)`,
            [email]
        );

        if (!memberResult.rows.length) {
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        const member = memberResult.rows[0];

        if (member.status === "inactive") {
            return res.status(403).json({ success: false, message: "Account is inactive. Contact admin." });
        }

        await query(
            `UPDATE otp_verification
       SET used = TRUE
       WHERE member_id = $1 AND otp_type = 'password_reset' AND used = FALSE`,
            [member.id]
        );

        const otp = generateOtp();
        const expiresAt = new Date(Date.now() + parseInt(process.env.OTP_EXPIRES_MINUTES || "10", 10) * 60000);
        const otpHash = await bcrypt.hash(otp, 10);

        await query(
            `INSERT INTO otp_verification (member_id, otp_code, otp_type, expires_at)
       VALUES ($1, $2, 'password_reset', $3)`,
            [member.id, otpHash, expiresAt]
        );

        await sendOtpEmail({ to: member.email, firstName: member.first_name, otp, purpose: "password_reset" });

        return res.json({ success: true, message: "Password reset OTP sent to your email." });
    } catch (err) {
        console.error("requestPasswordResetOtp error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

const verifyPasswordResetOtpAndSetPassword = async (req, res) => {
    const { email, otp, password, confirm_password } = req.body;

    if (!email || !otp || !password || !confirm_password) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (password !== confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    if (password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    const client = await getClient();
    try {
        await client.query("BEGIN");

        const memberResult = await client.query(
            `SELECT tm.id, tm.email, tm.first_name, lc.id AS cred_id
       FROM team_members tm
       JOIN login_credentials lc ON lc.member_id = tm.id
       WHERE LOWER(tm.email) = LOWER($1)`,
            [email]
        );

        if (!memberResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(404).json({ success: false, message: "Account not found." });
        }

        const member = memberResult.rows[0];

        const otpResult = await client.query(
            `SELECT id, otp_code, attempts
       FROM otp_verification
       WHERE member_id = $1
         AND otp_type = 'password_reset'
         AND used = FALSE
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
            [member.id]
        );

        if (!otpResult.rows.length) {
            await client.query("ROLLBACK");
            return res.status(400).json({ success: false, message: "OTP expired or invalid." });
        }

        const otpRow = otpResult.rows[0];
        const maxAttempts = parseInt(process.env.OTP_MAX_ATTEMPTS || "5", 10);

        if (otpRow.attempts >= maxAttempts) {
            await client.query("UPDATE otp_verification SET used = TRUE WHERE id = $1", [otpRow.id]);
            await client.query("COMMIT");
            return res.status(429).json({ success: false, message: "Too many attempts. Request a new OTP." });
        }

        const otpValid = await bcrypt.compare(otp, otpRow.otp_code);
        if (!otpValid) {
            await client.query("UPDATE otp_verification SET attempts = attempts + 1 WHERE id = $1", [otpRow.id]);
            await client.query("COMMIT");
            return res.status(401).json({ success: false, message: "Invalid OTP." });
        }

        const newHash = await bcrypt.hash(password, 12);

        await client.query("UPDATE otp_verification SET used = TRUE WHERE id = $1", [otpRow.id]);
        await client.query(
            `UPDATE login_credentials
       SET password_hash = $1,
           temp_password_hash = NULL,
           must_change = FALSE,
           reset_token = NULL,
           reset_token_expiry = NULL,
           updated_at = NOW()
       WHERE id = $2`,
            [newHash, member.cred_id]
        );

        await client.query(
            `UPDATE team_members
       SET status = 'active', updated_at = NOW()
       WHERE id = $1`,
            [member.id]
        );

        await client.query("COMMIT");

        sendPasswordChangedEmail({ to: member.email, firstName: member.first_name }).catch(console.error);

        return res.json({ success: true, message: "Password updated successfully. You can now log in." });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("verifyPasswordResetOtpAndSetPassword error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    } finally {
        client.release();
    }
};

const changePassword = async (req, res) => {
    const { current_password, new_password, confirm_password } = req.body;
    const memberId = req.user.id;

    if (!current_password || !new_password || !confirm_password) {
        return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (new_password !== confirm_password) {
        return res.status(400).json({ success: false, message: "Passwords do not match." });
    }

    if (new_password.length < 8) {
        return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
    }

    try {
        const credResult = await query(
            `SELECT id, password_hash, temp_password_hash
       FROM login_credentials
       WHERE member_id = $1`,
            [memberId]
        );

        if (!credResult.rows.length) {
            return res.status(404).json({ success: false, message: "Credentials not found." });
        }

        const cred = credResult.rows[0];
        const currentHash = cred.password_hash || cred.temp_password_hash;
        const valid = await bcrypt.compare(current_password, currentHash);

        if (!valid) {
            return res.status(401).json({ success: false, message: "Current password is incorrect." });
        }

        const newHash = await bcrypt.hash(new_password, 12);

        await query(
            `UPDATE login_credentials
       SET password_hash = $1,
           temp_password_hash = NULL,
           must_change = FALSE,
           updated_at = NOW()
       WHERE id = $2`,
            [newHash, cred.id]
        );

        sendPasswordChangedEmail({ to: req.user.email, firstName: req.user.first_name }).catch(console.error);

        return res.json({ success: true, message: "Password changed successfully." });
    } catch (err) {
        console.error("changePassword error:", err);
        return res.status(500).json({ success: false, message: "Server error." });
    }
};

module.exports = {
    requestPasswordResetOtp,
    verifyPasswordResetOtpAndSetPassword,
    changePassword
};