const nodemailer = require('nodemailer');
require('dotenv').config();

console.log('SMTP Config:');
console.log('HOST:', process.env.SMTP_HOST);
console.log('PORT:', process.env.SMTP_PORT);
console.log('SECURE:', process.env.SMTP_SECURE);
console.log('USER:', process.env.SMTP_USER);
console.log('FROM_NAME:', process.env.EMAIL_FROM_NAME);
console.log('FROM_ADDRESS:', process.env.EMAIL_FROM_ADDRESS);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function run() {
  try {
    console.log('\n1. Verifying SMTP Connection...');
    await transporter.verify();
    console.log('✅ Connection verified successfully.');

    const targetEmail = 'nethrakanchan40@gmail.com';
    console.log(`\n2. Sending "Hi" test email to ${targetEmail}...`);
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME || 'Tapovana'}" <${process.env.EMAIL_FROM_ADDRESS || process.env.SMTP_USER}>`,
      to: targetEmail,
      subject: 'Hi - Test Email from Tapovana',
      text: 'Hi Nethra, this is a test email sent from the Tapovana system to verify if your email address is receiving messages properly.',
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #cda751;">Hi Nethra!</h2>
          <p>This is a test email sent from the <strong>Tapovana</strong> system to check email delivery to <code>${targetEmail}</code>.</p>
          <p>If you receive this message, your email inbox is receiving emails properly!</p>
          <br/>
          <p>Best regards,<br/><strong>Tapovana Team</strong></p>
        </div>
      `,
    });

    console.log('✅ Email Sent Successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Accepted recipients:', info.accepted);
    console.log('Rejected recipients:', info.rejected);
    console.log('SMTP Server Response:', info.response);
  } catch (err) {
    console.error('❌ Error sending mail:');
    console.error(err);
  }
}

run();
