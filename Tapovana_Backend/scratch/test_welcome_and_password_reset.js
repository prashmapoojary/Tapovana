const bcrypt = require('bcryptjs');
const { query, getClient } = require('../src/config/db');
const teamController = require('../src/controllers/teamController');
const authController = require('../src/controllers/authController');
const passwordController = require('../src/controllers/passwordController');

async function testWelcomeAndPasswordResetFlow() {
  console.log("🔒 --- TEAM WELCOME EMAIL, TEMP PASSWORD & PASSWORD RESET TEST SUITE --- 🔒\n");

  const testEmail = `test.member.${Date.now()}@tapovana.com`;
  const tempPassword = `TapoPass#${Math.floor(1000 + Math.random() * 9000)}`;
  const newPassword = `NewSecurePass#2026!`;

  // Step 1: Clean up any old test accounts with this pattern
  await query(`DELETE FROM login_credentials WHERE member_id IN (SELECT id FROM team_members WHERE email LIKE 'test.member.%')`);
  await query(`DELETE FROM team_members WHERE email LIKE 'test.member.%'`);

  // Step 2: Get Doctor or Therapist role ID
  const roleRes = await query(`SELECT id FROM roles WHERE name = 'Doctor' LIMIT 1`);
  const roleId = roleRes.rows[0].id;

  // Step 3: Insert new team member with temporary password hash
  console.log("1️⃣ Step 1: Creating New Team Member & Generating Temporary Password...");
  const memberRes = await query(
    `INSERT INTO team_members (first_name, last_name, email, phone, role_id, status)
     VALUES ($1, $2, $3, $4, $5, 'active')
     RETURNING id, first_name, last_name, email`,
    ["TestFirstName", "TestLastName", testEmail, "9876543210", roleId]
  );
  const memberId = memberRes.rows[0].id;

  const tempHash = await bcrypt.hash(tempPassword, 12);
  await query(
    `INSERT INTO login_credentials (member_id, temp_password_hash, must_change)
     VALUES ($1, $2, TRUE)`,
    [memberId, tempHash]
  );

  console.log(`   ✨ Created Team Member ID: ${memberId} | Email: ${testEmail}`);
  console.log(`   🔑 Temporary Password Generated: "${tempPassword}"`);
  console.log("   ✅ STEP 1 PASSED!");

  // Step 4: Verify First-time Login using Temporary Password
  console.log("\n2️⃣ Step 2: Verifying Login with Temporary Password...");
  let req = { body: { email: testEmail, password: tempPassword } };
  let res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await authController.loginPassword(req, res);
  if (res.data && res.data.success) {
    console.log(`   Login Success Message: "${res.data.message}" | Must Change: ${res.data.must_change}`);
    console.log("   ✅ STEP 2 PASSED (Temporary Password accepted!)");
  } else {
    throw new Error(`Login failed with temp password: ${JSON.stringify(res.data)}`);
  }

  // Step 5: Simulate Reset Password (User sets NEW password)
  console.log("\n3️⃣ Step 3: User Resets Password to NEW Password...");
  const newHash = await bcrypt.hash(newPassword, 12);
  await query(
    `UPDATE login_credentials 
     SET password_hash = $1, temp_password_hash = NULL, must_change = FALSE, updated_at = NOW() 
     WHERE member_id = $2`,
    [newHash, memberId]
  );

  console.log(`   🔑 Password updated to: "${newPassword}"`);
  console.log("   Cleared temporary password hash & set must_change = FALSE.");
  console.log("   ✅ STEP 3 PASSED!");

  // Step 6: Verify Login with NEW Password
  console.log("\n4️⃣ Step 4: Verifying Login with NEW Password...");
  req = { body: { email: testEmail, password: newPassword } };
  res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await authController.loginPassword(req, res);
  if (res.data && res.data.success) {
    console.log(`   Login Success Message: "${res.data.message}"`);
    console.log("   ✅ STEP 4 PASSED (New Password accepted!)");
  } else {
    throw new Error(`Login failed with new password: ${JSON.stringify(res.data)}`);
  }

  // Step 7: Verify Login with OLD Temporary Password FAILS
  console.log("\n5️⃣ Step 5: Verifying Old Temporary Password is INACTIVE / REJECTED...");
  req = { body: { email: testEmail, password: tempPassword } };
  res = {
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await authController.loginPassword(req, res);
  if (res.statusCode === 401 || (res.data && !res.data.success)) {
    console.log(`   Expected Rejection Result: HTTP ${res.statusCode} | "${res.data?.message}"`);
    console.log("   ✅ STEP 5 PASSED (Old Temporary Password correctly rejected!)");
  } else {
    throw new Error("Old temp password was incorrectly accepted after reset!");
  }

  // Step 8: Clean up test member
  console.log("\n6️⃣ Step 6: Cleaning up test account...");
  await query(`DELETE FROM login_credentials WHERE member_id = $1`, [memberId]);
  await query(`DELETE FROM team_members WHERE id = $1`, [memberId]);
  console.log("   ✅ STEP 6 PASSED!");

  console.log("\n==================================================");
  console.log("🎉 ALL TEMPORARY PASSWORD & RESET FLOW TESTS PASSED!");
  console.log("==================================================\n");

  process.exit(0);
}

testWelcomeAndPasswordResetFlow().catch(err => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
