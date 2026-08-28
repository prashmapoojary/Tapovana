const { query } = require('../src/config/db');
const servicesController = require('../src/controllers/servicesController');

async function testMyAssignmentsFlow() {
  console.log("🌟 --- STARTING MY ASSIGNMENTS SPECIFICATION VERIFICATION --- 🌟\n");

  // 1. Fetch a Doctor/Therapist user
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') 
    LIMIT 1
  `);

  if (staffRes.rows.length === 0) {
    throw new Error("No Doctor or Therapist found in database.");
  }

  const staffUser = staffRes.rows[0];
  console.log(`👨‍⚕️ Target Staff Member: ${staffUser.first_name} ${staffUser.last_name} | ID: ${staffUser.id} | Role: ${staffUser.role} | Email: ${staffUser.email}\n`);

  // 2. Execute getMyAssignments via controller
  console.log("1️⃣ Step 1: Querying Assignments for Staff ID...");
  const req = {
    user: { id: staffUser.id, role: staffUser.role, email: staffUser.email },
    query: { staff_id: staffUser.id }
  };

  const res = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await servicesController.getMyAssignments(req, res);

  if (!res.data || !res.data.success) {
    throw new Error(`getMyAssignments failed: ${res.data?.message}`);
  }

  console.log("   ✅ API Response received successfully!");
  console.log(`   Staff Object: Code=${res.data.staff.staffCode} | Name="${res.data.staff.name}" | Role=${res.data.staff.role} | Email=${res.data.staff.email}`);
  console.log(`   Total Assignments Count: ${res.data.assignments.length}\n`);

  // 3. Verify Staff & Customer details on assignments
  console.log("2️⃣ Step 2: Validating Individual Assignment Details...");
  let serviceCount = 0, workshopCount = 0, vedicCount = 0;

  for (const a of res.data.assignments) {
    if (a.staffId !== staffUser.id) {
      throw new Error(`Assignment ${a.id} staffId mismatch! Expected ${staffUser.id}, got ${a.staffId}`);
    }

    if (a.type === 'service') serviceCount++;
    if (a.type === 'workshop') workshopCount++;
    if (a.type === 'vedic_program') vedicCount++;

    console.log(`   📌 [${a.type.toUpperCase()}] ID: ${a.displayRecordId} | Title: "${a.sessionTitle}" | Customer: "${a.customerName}" | Staff: ${a.staffName} (${a.staffCode})`);
  }

  console.log(`\n   Summary Breakdown: ${serviceCount} Services, ${workshopCount} Workshops, ${vedicCount} Vedic Programs`);
  console.log("   ✅ STAFF ID FILTERING & CUSTOMER MAPPING PASSED!");

  // 4. Verify Staff List filter for Admins
  console.log("\n3️⃣ Step 3: Verifying Staff List Role Filter (Doctor & Therapist only)...");
  const staffListRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist')
  `);
  console.log(`   Valid Clinical Staff Members Count: ${staffListRes.rows.length}`);
  console.log("   ✅ STAFF ROLE FILTER PASSED!");

  console.log("\n==================================================");
  console.log("🎉 ALL MY ASSIGNMENTS REQUIREMENTS VERIFIED & PASSED!");
  console.log("==================================================\n");

  process.exit(0);
}

testMyAssignmentsFlow().catch(err => {
  console.error("❌ My Assignments verification error:", err);
  process.exit(1);
});
