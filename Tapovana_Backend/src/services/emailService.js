const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT, 10),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const emailWrapper = (content) => {
    return `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#1a1a1a;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1a1a;padding:40px 0;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border-radius:12px;overflow:hidden;border:1px solid #2a2a2a;">
        <tr>
          <td align="center" style="padding:32px 40px 24px;">
            <img src="https://i.postimg.cc/5X7w5TCQ/logo.png" alt="Tapovana" width="180" style="display:block;margin:0 auto;" />
          </td>
        </tr>
        <tr><td style="padding:0 40px 40px;">${content}</td></tr>
        <tr>
          <td align="center" style="padding:24px 40px;border-top:1px solid #2a2a2a;color:#666;font-size:12px;">
            If you did not request this, please ignore this email.<br/>
            Thank you, <span style="color:#cda751;font-weight:600;">Tapovana Team</span>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
};

const sendWelcomeEmail = async ({ to, firstName, tempPassword }) => {
    const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Welcome to Tapovana!</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ` + firstName + `, your account has been created successfully.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#999;">Temporary Password:</p>
      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#cda751;letter-spacing:2px;font-family:monospace;">` + tempPassword + `</p>
      <p style="margin:0;font-size:12px;color:#777;">Use this temporary password to log in. After login, you must reset your password using email OTP.</p>
    </div>
  `);

    return transporter.sendMail({
        from: '"' + process.env.EMAIL_FROM_NAME + '" <' + process.env.EMAIL_FROM_ADDRESS + '>',
        to,
        subject: "Welcome to Tapovana - Temporary Login Password",
        html,
    });
};

const sendOtpEmail = async ({ to, firstName, otp, purpose = "login" }) => {
    const title = purpose === "password_reset" ? "Password Reset Verification" : "Login Verification";
    const subtitle = purpose === "password_reset"
        ? "Hello " + firstName + ", use the OTP below to reset your password."
        : "Hello " + firstName + ", use the OTP below to complete your login.";

    const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">` + title + `</h1>
    <p style="color:#cccccc;text-align:center;">
      ` + subtitle + `<br/>
      Valid for <strong style="color:#ccc;">` + (process.env.OTP_EXPIRES_MINUTES || 10) + ` minutes</strong>.
    </p>
    <div style="background:#1e1a0e;border:2px solid #cda751;border-radius:10px;padding:28px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;letter-spacing:1px;">ONE-TIME PASSWORD</p>
      <p style="margin:0;font-size:42px;font-weight:800;color:#cda751;letter-spacing:10px;font-family:monospace;">` + otp + `</p>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">Do not share this OTP with anyone.</p>
  `);

    return transporter.sendMail({
        from: '"' + process.env.EMAIL_FROM_NAME + '" <' + process.env.EMAIL_FROM_ADDRESS + '>',
        to,
        subject: purpose === "password_reset" ? "Tapovana — Password Reset OTP" : "Tapovana — Your Login OTP",
        html,
    });
};

const sendPasswordChangedEmail = async ({ to, firstName }) => {
    const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Password Updated</h1>
    <p style="color:#cccccc;text-align:center;">Hello ` + firstName + `,<br/>Your password has been successfully updated.</p>
    <div style="background:#0e1e13;border-left:4px solid #2e9e5e;border-radius:6px;padding:16px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#5ecb8a;font-size:15px;">✓ Password changed successfully</p>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">If you did not make this change, contact support immediately.</p>
  `);

    return transporter.sendMail({
        from: '"' + process.env.EMAIL_FROM_NAME + '" <' + process.env.EMAIL_FROM_ADDRESS + '>',
        to,
        subject: "Tapovana — Password Changed",
        html,
    });
};

// Send Allocation Email
const sendAllocationEmail = async ({ to, firstName, programName, programType, startDate, endDate }) => {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const start = startDate ? new Date(startDate).toLocaleDateString(undefined, dateOptions) : 'Not specified';
    const end = endDate ? new Date(endDate).toLocaleDateString(undefined, dateOptions) : 'Not specified';

    const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">New Allocation Confirmation</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ` + firstName + `,
    </p>
    <p style="color:#cccccc;text-align:center;">
      You have been allocated to the following <strong style="color:#cda751;">` + programType + `</strong>:
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">` + programName + `</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Start Date:</strong> ` + start + `</p>
      ` + (endDate ? '<p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>End Date:</strong> ' + end + '</p>' : '') + `
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">
      Please ensure you are available during this period. If you have any conflicts, please notify the admin immediately.
    </p>
    <p style="color:#888;text-align:center;font-size:13px;">
      Once the session is completed, please mark it as <strong style="color:#5ecb8a;">Done</strong> in your My Assignments dashboard.
    </p>
  `);

    return transporter.sendMail({
        from: '"' + process.env.EMAIL_FROM_NAME + '" <' + process.env.EMAIL_FROM_ADDRESS + '>',
        to,
        subject: "Tapovana — Allocation: " + programName,
        html,
    });
};

const sendResetOtpEmail = async ({ to, firstName, otp }) => {
    return sendOtpEmail({ to, firstName, otp, purpose: "password_reset" });
};

module.exports = { sendWelcomeEmail, sendOtpEmail, sendPasswordChangedEmail, sendAllocationEmail, sendResetOtpEmail };