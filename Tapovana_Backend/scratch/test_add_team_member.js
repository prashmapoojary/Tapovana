const { query } = require('../src/config/db');
const { sendWelcomeEmail } = require('../src/services/emailService');

async function testAddTeamMember() {
  console.log("🌟 --- TESTING TEAM MEMBER CREATION & TEMPORARY PASSWORD EMAIL --- 🌟\n");

  const testEmail = "29prashma10@gmail.com";
  const testFirstName = "DemoDoctor";

  console.log(`📧 Dispatching test welcome email with temporary password to: ${testEmail}...`);
  
  await sendWelcomeEmail({
    to: testEmail,
    firstName: testFirstName,
    tempPassword: "TapovanaTempPass123!",
    resetUrl: "https://tapovana-admin.onrender.com/set-password?token=demo"
  });

  console.log("   ✅ Welcome email with temporary password successfully sent!");
  process.exit(0);
}

testAddTeamMember().catch(err => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
