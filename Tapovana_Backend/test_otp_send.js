const { sendOtpEmail } = require("./src/services/emailService");
require("dotenv").config();

async function main() {
  try {
    const to = "prashma2910@gmail.com";
    console.log("Sending OTP to:", to);
    const info = await sendOtpEmail({
      to: to,
      firstName: "pras",
      otp: "123456",
      purpose: "login"
    });
    console.log("✅ OTP Email sent successfully! Message ID:", info.messageId);
  } catch (err) {
    console.error("❌ sendOtpEmail failed:");
    console.error(err);
  }
}

main();
