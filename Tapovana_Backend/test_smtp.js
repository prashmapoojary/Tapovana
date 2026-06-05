const nodemailer = require("nodemailer");
require("dotenv").config();

console.log("Config loaded:");
console.log("SMTP_HOST:", process.env.SMTP_HOST);
console.log("SMTP_PORT:", process.env.SMTP_PORT);
console.log("SMTP_SECURE:", process.env.SMTP_SECURE);
console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SMTP_PASS:", process.env.SMTP_PASS ? "PRESENT" : "MISSING");

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT, 10),
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function main() {
  try {
    console.log("Verifying connection to SMTP...");
    await transporter.verify();
    console.log("✅ SMTP Connection verified successfully!");
    
    console.log("Sending test email...");
    const info = await transporter.sendMail({
      from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
      to: process.env.SMTP_USER, // send to self
      subject: "Tapovana SMTP Test",
      text: "This is a test email from Tapovana SMTP debug script.",
    });
    console.log("✅ Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ SMTP Error occurred:");
    console.error(err);
  }
}

main();
