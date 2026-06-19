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
const sendBookingStatusEmail = async ({ to, firstName, status, details = {} }) => {
  const customerName = firstName || "Customer";
  const serviceName = details.service || "N/A";
  
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";
  const dateTime = `${formattedDate}, ${details.time || "N/A"}`;
  
  let subject = "";
  let bodyContent = "";

  if (status === "PENDING") {
    subject = "Booking Submitted - Pending Confirmation";
    bodyContent = `
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${customerName},</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Your booking has been submitted successfully and is currently pending confirmation.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
        <strong>Service:</strong> ${serviceName}<br/>
        <strong>Date & Time:</strong> ${dateTime}
      </p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">We will notify you once it is confirmed.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
    `;
  } else if (status === "CONFIRMED") {
    subject = "Booking Confirmed";
    const staffName = details.staff || "Not Assigned";
    bodyContent = `
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${customerName},</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Your booking has been confirmed.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
        <strong>Service:</strong> ${serviceName}<br/>
        <strong>Date & Time:</strong> ${dateTime}<br/>
        <strong>Assigned Staff:</strong> ${staffName}
      </p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">Thank you for choosing us.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
    `;
  } else if (status === "CANCELLED") {
    subject = "Booking Cancelled";
    bodyContent = `
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${customerName},</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Your booking has been cancelled.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
        <strong>Service:</strong> ${serviceName}<br/>
        <strong>Date & Time:</strong> ${dateTime}
      </p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">We regret the inconvenience.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
    `;
  } else if (status === "COMPLETED") {
    subject = "Booking Completed";
    bodyContent = `
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${customerName},</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Your booking has been successfully completed.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
        <strong>Service:</strong> ${serviceName}<br/>
        <strong>Date & Time:</strong> ${dateTime}
      </p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">Thank you for your trust.</p>
      <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
    `;
  }

  const html = emailWrapper(bodyContent);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
  });
};

const sendBookingAllocationEmail = async ({ to, staffName, bookingId, details = {} }) => {
  const serviceName = details.service || "N/A";
  
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";
  const dateTime = `${formattedDate}, ${details.time || "N/A"}`;
  
  const customerName = details.customer || "Guest";

  const bodyContent = `
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${staffName},</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">You have been allocated to booking ${bookingId}.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
      <strong>Service:</strong> ${serviceName}<br/>
      <strong>Date & Time:</strong> ${dateTime}<br/>
      <strong>Customer:</strong> ${customerName}
    </p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">Please check your assignments page.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
  `;

  const html = emailWrapper(bodyContent);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "New Booking Allocation",
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
  const serviceName = details.service || "N/A";
  
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";
  const dateTime = `${formattedDate}, ${details.time || "N/A"}`;

  const bodyContent = `
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${staffName},</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">You have been removed from booking ${bookingId}.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
      <strong>Service:</strong> ${serviceName}<br/>
      <strong>Date & Time:</strong> ${dateTime}
    </p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">A new staff member has been allocated.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
  `;

  const html = emailWrapper(bodyContent);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Booking Reallocation Notice",
    html,
  });
};

const sendStaffCompletionEmail = async ({ to, staffName, bookingId, details = {} }) => {
  const serviceName = details.service || "N/A";
  
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";
  const dateTime = `${formattedDate}, ${details.time || "N/A"}`;

  const bodyContent = `
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${staffName},</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Booking ${bookingId} has been marked as completed.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
      <strong>Service:</strong> ${serviceName}<br/>
      <strong>Date & Time:</strong> ${dateTime}
    </p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">Thank you for your service.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
  `;

  const html = emailWrapper(bodyContent);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Booking Completed",
    html,
  });
};

const sendStaffCancellationEmail = async ({ to, staffName, bookingId, details = {} }) => {
  const serviceName = details.service || "N/A";
  
  const formattedDate = details.date ? new Date(details.date).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }) : "N/A";
  const dateTime = `${formattedDate}, ${details.time || "N/A"}`;

  const bodyContent = `
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Dear ${staffName},</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">Booking ${bookingId} has been cancelled.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 16px 0;">
      <strong>Service:</strong> ${serviceName}<br/>
      <strong>Date & Time:</strong> ${dateTime}
    </p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0 0 24px 0;">You are no longer allocated to this booking.</p>
    <p style="color:#cccccc; font-size:14px; line-height:1.6; margin:0;">Regards,<br/><strong style="color:#cda751;">Tapovana</strong></p>
  `;

  const html = emailWrapper(bodyContent);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Booking Cancelled Notice",
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
      <p style="color:#cda751;font-weight:700;margin:0 0 10px 0;">Instructions for participation:</p>
      <ul style="margin:0;padding-left:20px;color:#cccccc;">
        <li style="margin-bottom:6px;">Please log in 5 minutes early to test your connection.</li>
        <li style="margin-bottom:6px;">Have a quiet space and a yoga mat or notebook ready.</li>
        <li style="margin-bottom:6px;">Follow the instructor's guidance throughout the session.</li>
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
      Workshop ${workshopTitle} is scheduled for ${dateTimeStr}.
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
    <p style="color:#cccccc;font-size:15px;line-height:1.6;margin: 20px 0 20px;">
      Join the session now.
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Workshop is Live Now",
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
      You have been deallocated from Workshop ${workshopTitle}.
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

// ─── Workshop Completed Email ────────────────────────────────────────────────
const sendWorkshopCompletedEmail = async ({ to, staffOrParticipantName, workshopTitle, date, time }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date ? new Date(date).toLocaleDateString(undefined, dateOptions) : 'Not specified';
  const dateTimeStr = `${formattedDate}${time ? ' at ' + time : ''}`;

  const html = emailWrapper(`
    <h1 style="color:#a0aec0;text-align:center;">Workshop Completed</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffOrParticipantName || 'Valued Guest'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Workshop ${workshopTitle} has been completed successfully.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Workshop Completed – ${workshopTitle}`,
    html,
  });
};

const sendWorkshopAllocationNotificationEmail = async ({ to, staffName, workshopTitle, date, time }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedDate = date ? new Date(date).toLocaleDateString(undefined, dateOptions) : "Not specified";
  const dateTimeStr = `${formattedDate} at ${time || "N/A"}`;

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Workshop Assignment Notification</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      You have been assigned to Workshop ${workshopTitle} on ${dateTimeStr}.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:24px 0 0 0;">
      Best regards,<br/>
      <strong>Workshop Admin Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Workshop Assignment Notice: ${workshopTitle}`,
    html,
  });
};


const sendVedicRegistrationEmail = async ({ to, userName, programTitle, startDate, endDate, time, status, assignedStaff }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedStart = startDate ? new Date(startDate).toLocaleDateString(undefined, dateOptions) : "Not specified";
  const formattedEnd = endDate ? new Date(endDate).toLocaleDateString(undefined, dateOptions) : null;
  const dateStr = formattedEnd ? `${formattedStart} to ${formattedEnd}` : formattedStart;
  const staff = assignedStaff || "Not assigned";

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Vedic Program Registration</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName || 'Valued Participant'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Your registration for the Vedic Program <strong style="color:#cda751;">${programTitle}</strong> has been received.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Program:</strong> ${programTitle}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Time:</strong> ${time || "N/A"}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Assigned Staff:</strong> ${staff}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Status:</strong> <span style="color:#cda751;font-weight:600;text-transform:capitalize;">${status}</span></p>
    </div>

    <div style="margin:24px 0;color:#cccccc;font-size:14px;line-height:1.6;">
      <p style="color:#cda751;font-weight:700;margin:0 0 10px 0;">Instructions for participation:</p>
      <ul style="margin:0;padding-left:20px;color:#cccccc;">
        <li style="margin-bottom:6px;">Please arrive 15 minutes before the scheduled start time.</li>
        <li style="margin-bottom:6px;">Wear comfortable and appropriate clothing for physical activities.</li>
        <li style="margin-bottom:6px;">If you have any specific medical conditions or dietary requirements, please notify your Lead Consultant in advance.</li>
      </ul>
    </div>
    
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 24px 0 0 0;">
      We look forward to embarking on this Vedic journey with you.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Vedic Program Registration: ${programTitle}`,
    html,
  });
};

const sendVedicAdminRegistrationNotification = async ({ to, participantName, participantEmail, participantPhone, programTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">New Vedic Program Registration</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello Admin,
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      A new participant has registered for the Vedic Program: <strong style="color:#cda751;">${programTitle}</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Participant Name:</strong> ${participantName}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Email:</strong> ${participantEmail}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Phone:</strong> ${participantPhone || 'N/A'}</p>
    </div>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Admin Alert — New Registration: ${programTitle}`,
    html,
  });
};

const sendVedicStaffAssignmentEmail = async ({ to, staffName, programTitle, role, startDate, endDate, time }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedStart = startDate ? new Date(startDate).toLocaleDateString(undefined, dateOptions) : "Not specified";
  const formattedEnd = endDate ? new Date(endDate).toLocaleDateString(undefined, dateOptions) : null;
  const dateStr = formattedEnd ? `${formattedStart} to ${formattedEnd}` : formattedStart;

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Vedic Program Assignment</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${staffName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      You have been assigned to the Vedic Program <strong style="color:#cda751;">${programTitle}</strong> as a <strong style="color:#cda751;">${role}</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Program:</strong> ${programTitle}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Role:</strong> ${role}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Date:</strong> ${dateStr}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Time:</strong> ${time || "N/A"}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Program Assignment: ${programTitle}`,
    html,
  });
};

const sendVedicUpdateEmail = async ({ to, userName, programTitle, changes }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Vedic Program Update</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      There has been an update to the Vedic Program <strong style="color:#cda751;">${programTitle}</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:14px;color:#cda751;font-weight:600;">Details of Changes:</p>
      <p style="margin:0;font-size:13px;color:#ccc;white-space:pre-line;">${changes}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Vedic Program Update: ${programTitle}`,
    html,
  });
};

const sendVedicReminderEmail = async ({ to, userName, programTitle, daysRemaining, startDate, time }) => {
  const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
  const formattedStart = startDate ? new Date(startDate).toLocaleDateString(undefined, dateOptions) : "Not specified";

  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">Vedic Program Reminder</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      This is a reminder that the Vedic Program <strong style="color:#cda751;">${programTitle}</strong> is scheduled in <strong style="color:#cda751;">${daysRemaining} day(s)</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Program:</strong> ${programTitle}</p>
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Start Date:</strong> ${formattedStart}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Time:</strong> ${time || "N/A"}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Program Reminder (${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left): ${programTitle}`,
    html,
  });
};

const sendVedicCancellationEmail = async ({ to, userName, programTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Program Cancelled</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${userName},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      We regret to inform you that the Vedic Program <strong style="color:#e74c3c;">${programTitle}</strong> has been cancelled.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Vedic Program Cancelled: ${programTitle}`,
    html,
  });
};

// ─── Blog CMS Email Templates ──────────────────────────────────────────
const sendBlogSubmittedEmail = async ({ to, adminName, authorName, blogTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#cda751;text-align:center;">New Blog Submission</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${adminName || 'Admin'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      A new blog article has been submitted for review by <strong style="color:#cda751;">${authorName}</strong>.
    </p>
    <div style="background:#1e1a0e;border-left:4px solid #cda751;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Article Title:</strong> ${blogTitle}</p>
      <p style="margin:0;font-size:13px;color:#ccc;"><strong>Author:</strong> ${authorName}</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Please log in to the admin panel to review and approve or reject this article.<br/>
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — New Blog Submission: ${blogTitle}`,
    html,
  });
};

const sendBlogApprovedEmail = async ({ to, authorName, blogTitle }) => {
  const html = emailWrapper(`
    <h1 style="color:#2ecc71;text-align:center;">Blog Approved & Published!</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${authorName || 'Author'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Great news! Your blog article has been approved and is now live.
    </p>
    <div style="background:#0e1e13;border-left:4px solid #2ecc71;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Article:</strong> ${blogTitle}</p>
      <p style="margin:0;font-size:13px;color:#5ecb8a;">✓ Published successfully</p>
    </div>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Blog Published: ${blogTitle}`,
    html,
  });
};

const sendBlogRejectedEmail = async ({ to, authorName, blogTitle, reason }) => {
  const html = emailWrapper(`
    <h1 style="color:#e74c3c;text-align:center;">Blog Article Rejected</h1>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0;">
      Hello ${authorName || 'Author'},
    </p>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 0 0 20px 0;">
      Your blog submission has been reviewed and could not be approved at this time.
    </p>
    <div style="background:#2c1a1a;border-left:4px solid #e74c3c;border-radius:6px;padding:20px 24px;margin:20px 0;">
      <p style="margin:0 0 8px;font-size:13px;color:#ccc;"><strong>Article:</strong> ${blogTitle}</p>
      <p style="margin:0 0 8px;font-size:14px;color:#e74c3c;font-weight:600;">Reason for Rejection:</p>
      <p style="margin:0;font-size:13px;color:#ccc;white-space:pre-line;">${reason || 'No reason provided.'}</p>
    </div>
    <p style="color:#cccccc;font-size:14px;line-height:1.6;margin: 20px 0 0 0;">
      You may edit and resubmit your article from your Blogs dashboard.
    </p>
    <p style="color:#888;font-size:13px;line-height:1.5;margin:20px 0 0 0;">
      Best regards,<br/>
      <strong>Tapovana Team</strong>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: `Tapovana — Blog Rejected: ${blogTitle}`,
    html,
  });
};

const sendWorkshopCompletionCertificateEmail = async ({ to, participantName, workshopTitle, completionDate, downloadUrl }) => {
  const html = emailWrapper(`
    <p style="color:#cccccc;font-size:15px;line-height:1.6;margin: 20px 0 10px;">
      Click below to download your certificate.
    </p>
    <p style="color:#cccccc;font-size:15px;line-height:1.6;margin: 0 0 25px 0;">
      <a href="${downloadUrl}" style="color:#cda751;font-weight:bold;text-decoration:underline;">${downloadUrl}</a>
    </p>
  `);

  return transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject: "Workshop Completed – Download Your Certificate",
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
  sendWorkshopDeallocationEmail,
  sendWorkshopCompletedEmail,
  sendStaffCompletionEmail,
  sendStaffCancellationEmail,
  sendWorkshopAllocationNotificationEmail,
  sendVedicRegistrationEmail,
  sendVedicAdminRegistrationNotification,
  sendVedicStaffAssignmentEmail,
  sendVedicUpdateEmail,
  sendVedicReminderEmail,
  sendVedicCancellationEmail,
  sendBlogSubmittedEmail,
  sendBlogApprovedEmail,
  sendBlogRejectedEmail,
  sendWorkshopCompletionCertificateEmail
};