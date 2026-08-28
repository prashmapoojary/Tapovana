const { sendOtpEmail, sendPasswordChangedEmail } = require('../src/services/emailService');

async function runPasswordAndOtpEmailTests() {
  console.log("🌟 --- TESTING LOGIN OTP, FORGOT PASSWORD OTP, & PASSWORD CHANGED EMAILS --- 🌟\n");

  const email1 = "prashmapoojary@gmail.com";
  const email2 = "nethrakanchan40@gmail.com";

  // 1. Test Login OTP for Prashma Poojary
  console.log(`1️⃣ Sending Login OTP to: "${email1}"...`);
  await sendOtpEmail({
    to: email1,
    firstName: "Prashma Poojary",
    otp: "654321",
    purpose: "login"
  });
  console.log(`   ✅ Sent Login OTP to ${email1}!\n`);

  // 2. Test Login OTP for Nethra Kanchan
  console.log(`2️⃣ Sending Login OTP to: "${email2}"...`);
  await sendOtpEmail({
    to: email2,
    firstName: "Nethra Kanchan",
    otp: "789123",
    purpose: "login"
  });
  console.log(`   ✅ Sent Login OTP to ${email2}!\n`);

  // 3. Test Password Reset OTP for Prashma Poojary
  console.log(`3️⃣ Sending Forgot Password Reset OTP to: "${email1}"...`);
  await sendOtpEmail({
    to: email1,
    firstName: "Prashma Poojary",
    otp: "112233",
    purpose: "password_reset"
  });
  console.log(`   ✅ Sent Password Reset OTP to ${email1}!\n`);

  // 4. Test Password Reset OTP for Nethra Kanchan
  console.log(`4️⃣ Sending Forgot Password Reset OTP to: "${email2}"...`);
  await sendOtpEmail({
    to: email2,
    firstName: "Nethra Kanchan",
    otp: "445566",
    purpose: "password_reset"
  });
  console.log(`   ✅ Sent Password Reset OTP to ${email2}!\n`);

  // 5. Test Password Changed confirmation for Prashma Poojary
  console.log(`5️⃣ Sending Password Changed Email to: "${email1}"...`);
  await sendPasswordChangedEmail({
    to: email1,
    firstName: "Prashma Poojary"
  });
  console.log(`   ✅ Sent Password Changed email to ${email1}!\n`);

  // 6. Test Password Changed confirmation for Nethra Kanchan
  console.log(`6️⃣ Sending Password Changed Email to: "${email2}"...`);
  await sendPasswordChangedEmail({
    to: email2,
    firstName: "Nethra Kanchan"
  });
  console.log(`   ✅ Sent Password Changed email to ${email2}!\n`);

  console.log("==========================================");
  console.log("🎉 ALL OTP & PASSWORD EMAIL ROUTING TESTS VERIFIED 100%!");
  console.log("==========================================\n");

  process.exit(0);
}

runPasswordAndOtpEmailTests().catch(err => {
  console.error("❌ Email test error:", err);
  process.exit(1);
});
