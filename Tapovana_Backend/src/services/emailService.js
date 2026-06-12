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

const emailWrapper = (content) => `
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

const sendWelcomeEmail = async ({ to, firstName, tempPassword }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Welcome to Tapovana!</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ${firstName}, your account has been created successfully.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#999;">Temporary Password:</p>
      <p style="margin:0 0 8px;font-size:22px;font-weight:700;color:#cda751;letter-spacing:2px;font-family:monospace;">${tempPassword}</p>
      <p style="margin:0;font-size:12px;color:#777;">Use this temporary password to log in. After login, you must reset your password using email OTP.</p>
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Welcome to Tapovana - Temporary Login Password",
    html,
  });
};

const sendOtpEmail = async ({ to, firstName, otp, purpose = "login" }) => {
  const title = purpose === "password_reset" ? "Password Reset Verification" : "Login Verification";
  const subtitle = purpose === "password_reset"
    ? `Hello ${firstName}, use the OTP below to reset your password.`
    : `Hello ${firstName}, use the OTP below to complete your login.`;

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">${title}</h1>
    <p style="color:#cccccc;text-align:center;">
      ${subtitle}<br/>
      Valid for <strong style="color:#ccc;">${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>.
    </p>
    <div style="background:#1e1a0e;border:2px solid #cda751;border-radius:10px;padding:28px;margin:24px 0;text-align:center;">
      <p style="margin:0 0 6px;font-size:13px;color:#888;letter-spacing:1px;">ONE-TIME PASSWORD</p>
      <p style="margin:0;font-size:42px;font-weight:800;color:#cda751;letter-spacing:10px;font-family:monospace;">${otp}</p>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">Do not share this OTP with anyone.</p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: purpose === "password_reset" ? "Tapovana — Password Reset OTP" : "Tapovana — Your Login OTP",
    html,
  });
};

const sendPasswordChangedEmail = async ({ to, firstName }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Password Updated</h1>
    <p style="color:#cccccc;text-align:center;">Hello ${firstName},<br/>Your password has been successfully updated.</p>
    <div style="background:#0e1e13;border-left:4px solid #2e9e5e;border-radius:6px;padding:16px 20px;margin:20px 0;text-align:center;">
      <p style="margin:0;color:#5ecb8a;font-size:15px;">✓ Password changed successfully</p>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">If you did not make this change, contact support immediately.</p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Tapovana — Password Changed",
    html,
  });
};

// ─── NEW: Send Allocation Email ───────────────────────────────────────────
const sendAllocationEmail = async ({ to, firstName, programName, programType, startDate, endDate }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const start = startDate ? new Date(startDate).toLocaleDateString(undefined, dateOptions) : 'Not specified';
  const end = endDate ? new Date(endDate).toLocaleDateString(undefined, dateOptions) : 'Not specified';

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">New Allocation Confirmation</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ${firstName},
    </p>
    <p style="color:#cccccc;text-align:center;">
      You have been allocated to the following <strong style="color:#cda751;">${programType}</strong>:
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">${programName}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Start Date:</strong> ${start}</p>
      ${endDate ? `<p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>End Date:</strong> ${end}</p>` : ''}
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">
      Please ensure you are available during this period. If you have any conflicts, please notify the admin immediately.
    </p>
    <p style="color:#888;text-align:center;font-size:13px;">
      Once the session is completed, please mark it as <strong style="color:#5ecb8a;">Done</strong> in your My Assignments dashboard.
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Allocation: ${programName}`,
    html,
  });
};

// ─── NEW: Booking Email Notifications ──────────────────────────────────────
const sendBookingStatusEmail = async ({ to, firstName, status, details = {}, previousStatus = null }) => {
  let subject = "";
  let message = "";
  let detailsHtml = "";

  const formattedDate = details.date ? new Date(details.date).toLocaleDateString() : "";

  if (status === "PENDING") {
    subject = "Tapovana — Booking Pending Approval";
    message = "Your booking request is pending approval.";
  } else if (status === "CONFIRMED") {
    subject = "Tapovana — Booking Confirmed";
    message = "Your booking has been confirmed.";
    detailsHtml = `
      <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
        <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">Booking Details</p>
        <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Service:</strong> ${details.service || "N/A"}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${formattedDate}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Time:</strong> ${details.time || "N/A"}</p>
        <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Staff:</strong> ${details.staff || "Not Assigned"}</p>
      </div>
    `;
  } else if (status === "CANCELLED") {
    if (previousStatus === "CONFIRMED") {
      subject = "Tapovana — Confirmed Booking Cancelled";
      message = "Your confirmed booking has been cancelled.";
    } else {
      subject = "Tapovana — Booking Cancelled";
      message = "Your booking has been cancelled.";
    }
  } else if (status === "COMPLETED") {
    subject = "Tapovana — Booking Completed";
    message = "Your booking has been marked as completed.";
  }

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Booking Update</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ${firstName},
    </p>
    <p style="color:#cccccc;text-align:center;">
      ${message}
    </p>
    ${detailsHtml}
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
};

const sendBookingAllocationEmail = async ({ to, staffName, bookingId, details = {} }) => {
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString() : "";
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">New Booking Allocation</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;text-align:center;">
      You have been allocated to booking <strong>#${bookingId}</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">Booking Details</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Service:</strong> ${details.service || "N/A"}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Time:</strong> ${details.time || "N/A"}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Customer:</strong> ${details.customer || "Guest"}</p>
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — New Booking Allocation #${bookingId}`,
    html,
  });
};

const sendStaffLeaveCancellationEmail = async ({ to, staffName, details = [] }) => {
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Allocations Cancelled Due to Leave</h1>
    <p style="color:#cccccc;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;">
      Your allocations have been cancelled due to your marked leave.
    </p>
    <div style="background:#2c1a1a;border-left:4px solid #e74c3c;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#e74c3c;font-weight:600;">Affected Sessions:</p>
      ${details.map(d => `<p style="margin:0 0 4px;font-size:13px;color:#ccc;">• <strong>${d.type}</strong>: ${d.title} on ${new Date(d.date).toLocaleDateString()} at ${d.time || 'N/A'}</p>`).join('')}
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Tapovana — Allocations Cancelled due to Leave",
    html,
  });
};

const sendAdminLeaveAlertEmail = async ({ to, staffName, details = [] }) => {
  const html = emailWrapper(`
    <h1 style="color:#e67e22;text-align:center;">Staff Leave Alert</h1>
    <p style="color:#cccccc;">
      Hello Admin,
    </p>
    <p style="color:#cccccc;">
      Staff member <strong style="color:#cda751;">${staffName}</strong> has marked leave and is unavailable. Reallocation is required for the following sessions:
    </p>
    <div style="background:#2c221a;border-left:4px solid #e67e22;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#e67e22;font-weight:600;">Sessions Needing Reassignment:</p>
      ${details.map(d => `<p style="margin:0 0 4px;font-size:13px;color:#ccc;">• <strong>${d.type}</strong>: ${d.title} on ${new Date(d.date).toLocaleDateString()} at ${d.time || 'N/A'}</p>`).join('')}
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Staff ${staffName} Unavailable: Reallocation Required`,
    html,
  });
};

const sendBookingRemovalEmail = async ({ to, staffName, bookingId, details = {} }) => {
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString() : "";
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Booking Allocation Removed</h1>
    <p style="color:#cccccc;text-align:center;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;text-align:center;">
      You have been <strong style="color:#e74c3c;">removed</strong> from booking <strong>#${bookingId}</strong>.
    </p>
    <div style="background:#2c1a1a;border-left:4px solid #e74c3c;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#e74c3c;font-weight:600;">Booking Details</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Service:</strong> ${details.service || "N/A"}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${formattedDate}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Time:</strong> ${details.time || "N/A"}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Customer:</strong> ${details.customer || "Guest"}</p>
    </div>
    <p style="color:#888;text-align:center;font-size:13px;">
      This service has been reassigned. You are no longer required for this booking.
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Removed from Booking #${bookingId}`,
    html,
  });
};

const sendUserReassignmentEmail = async ({ to, userName, details = {} }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Booking Reassigned</h1>
    <p style="color:#cccccc;">
      Hello ${userName},
    </p>
    <p style="color:#cccccc;">
      Your upcoming session has been reassigned to a new specialist.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">Updated Session Details</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Service:</strong> ${details.service || 'N/A'}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${new Date(details.date).toLocaleDateString()}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>Time:</strong> ${details.time || 'N/A'}</p>
      <p style="margin:0 0 4px;font-size:13px;color:#ccc;"><strong>New Specialist:</strong> ${details.staff || 'N/A'}</p>
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Tapovana — Session Reassigned",
    html,
  });
};

const sendWorkshopEnrollmentEmail = async ({ to, userName, workshopTitle, date, time, instructorName }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date ? new Date(date).toLocaleDateString(undefined, dateOptions) : "Not specified";
  const instructor = instructorName || "Not assigned";
  
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Workshop Enrollment Confirmed!</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName || 'Valued Guest'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      You have been successfully enrolled for the upcoming workshop:
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Workshop:</strong> ${workshopTitle}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Date & Time:</strong> ${formattedDate} at ${time || "N/A"}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Instructor:</strong> ${instructor}</p>
    </div>
    
    <div style="margin:24px 0;color:#cccccc;font-size:14px;line-height:1.6;">
      <p style="color:#cda751;font-weight:700;margin:0 0 10px 0;">What to expect:</p>
      <ul style="margin:0;padding-left:20px;color:#cccccc;">
        <li style="margin-bottom:6px;">You’ll receive reminders before the session starts.</li>
        <li style="margin-bottom:6px;">Please join on time to get the full benefit.</li>
        <li style="margin-bottom:6px;">Bring any questions or topics you’d like to discuss.</li>
      </ul>
    </div>
    
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 24px 0 0 0;">
      We look forward to seeing you there!
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Enrollment Confirmed: ${workshopTitle}`,
    html,
  });
};

const sendWorkshopRemovalEmail = async ({ to, userName, workshopTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Workshop Enrollment Removed</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName || 'Valued Guest'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Your enrollment in the workshop <strong style="color:#e74c3c;">${workshopTitle}</strong> has been cancelled/removed by the administrator.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
      If you did not request this change, please contact the admin team.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Workshop Enrollment Cancelled: ${workshopTitle}`,
    html,
  });
};

const sendWorkshopScheduledEmail = async ({ to, staffOrParticipantName, workshopTitle, date, time }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date ? new Date(date).toLocaleDateString(undefined, dateOptions) : "Not specified";
  const dateTimeStr = `${formattedDate} at ${time || "N/A"}`;
  
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Workshop Scheduled</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffOrParticipantName || 'Valued Guest'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Your workshop ${workshopTitle} is scheduled for ${dateTimeStr}. Please be ready to join.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Workshop Scheduled – ${workshopTitle}`,
    html,
  });
};

const sendWorkshopOngoingEmail = async ({ to, staffOrParticipantName, workshopTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#2ecc71;text-align:center;">Workshop is LIVE</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffOrParticipantName || 'Valued Guest'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Your workshop ${workshopTitle} is now LIVE. Join immediately to participate.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Workshop is LIVE – ${workshopTitle}`,
    html,
  });
};

const sendWorkshopDeallocationEmail = async ({ to, staffName, workshopTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Workshop Allocation Removed</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      You have been <strong style="color:#e74c3c;">removed</strong> from the workshop: <strong>${workshopTitle}</strong>.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      This workshop has been reassigned. You are no longer required for this session.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Removed from Workshop: ${workshopTitle}`,
    html,
  });
};

module.exports = { 
  sendWelcomeEmail, 
  sendOtpEmail, 
  sendPasswordChangedEmail, 
  sendAllocationEmail,
  sendBookingStatusEmail,
  sendBookingAllocationEmail,
  sendBookingRemovalEmail,
  sendStaffLeaveCancellationEmail,
  sendAdminLeaveAlertEmail,
  sendUserReassignmentEmail,
  sendWorkshopEnrollmentEmail,
  sendWorkshopRemovalEmail,
  sendWorkshopScheduledEmail,
  sendWorkshopOngoingEmail,
  sendWorkshopDeallocationEmail
};