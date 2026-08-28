const { query } = require('../src/config/db');

// Mock email service functions to test without SMTP network latency
const emailService = require('../src/services/emailService');
let emailSent = false;
let emailRecipient = null;
let emailWorkshopTitle = null;

emailService.sendWorkshopAllocationNotificationEmail = async (params) => {
  emailSent = true;
  emailRecipient = params.to;
  emailWorkshopTitle = params.workshopTitle;
  console.log(`   📧 [MOCK EMAIL SENT] To: ${params.to} | Staff: ${params.staffName} | Workshop: "${params.workshopTitle}"`);
  return true;
};

const workshopController = require('../src/controllers/workshopController');
const servicesController = require('../src/controllers/servicesController');

async function verifyWorkshopStaffFlow() {
  console.log("🌟 --- STARTING WORKSHOP STAFF ALLOCATION & EMAIL FLOW VERIFICATION --- 🌟\n");

  // 1. Fetch Doctor or Therapist from Team
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);

  if (staffRes.rows.length === 0) {
    throw new Error("No active Doctor or Therapist found in team_members!");
  }
  const targetStaff = staffRes.rows[0];
  console.log(`👨‍⚕️ Target Staff Member: ${targetStaff.first_name} ${targetStaff.last_name} (${targetStaff.role}) | ID: ${targetStaff.id} | Email: ${targetStaff.email}`);

  // 2. Step 1: Create Workshop with Staff Allocation
  console.log("\n1️⃣ Step 1: Creating Workshop with Allocated Staff...");
  const createReq = {
    user: { id: targetStaff.id },
    body: {
      title: "Master Gold Specification Yoga & Meditation Workshop",
      category: "Yoga",
      instructor: `${targetStaff.first_name} ${targetStaff.last_name}`,
      instructor_id: targetStaff.id,
      assigned_staff_ids: [targetStaff.id],
      date: "2026-12-01",
      time: "10:00 AM",
      duration: 60,
      capacity: 50,
      price: 2500,
      description: "Master flow testing for staff allocation and email delivery."
    }
  };

  const createRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await workshopController.createWorkshop(createReq, createRes);
  if (!createRes.data || !createRes.data.success) {
    throw new Error(`Failed to create workshop: ${createRes.data?.message}`);
  }

  const createdWorkshop = createRes.data.workshop;
  console.log(`   ✅ Created Workshop ID: ${createdWorkshop.id} | Title: "${createdWorkshop.title}"`);

  // 3. Step 2: Verify Allocation Email sent
  console.log("\n2️⃣ Step 2: Verifying Email Notification Sent to Staff...");
  if (!emailSent || emailRecipient !== targetStaff.email) {
    throw new Error(`Allocation email notification was not sent to ${targetStaff.email}!`);
  }
  console.log(`   ✅ EMAIL NOTIFICATION VERIFIED! Sent to ${emailRecipient} for "${emailWorkshopTitle}"`);

  // 4. Step 3: Verify My Assignments endpoint for this Staff Member
  console.log("\n3️⃣ Step 3: Verifying My Assignments Endpoint for Logged-In Staff...");
  const assignReq = {
    user: { id: targetStaff.id, role: targetStaff.role },
    query: { staff_id: targetStaff.id }
  };
  const assignRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await servicesController.getMyAssignments(assignReq, assignRes);
  if (!assignRes.data || !assignRes.data.success) {
    throw new Error(`Failed to fetch assignments: ${assignRes.data?.message}`);
  }

  const assignments = assignRes.data.assignments || [];
  console.log(`   Total My Assignments returned for staff ID ${targetStaff.id}: ${assignments.length}`);
  const matchingWorkshop = assignments.find(a => String(a.sessionId) === String(createdWorkshop.id) || String(a.id).includes(String(createdWorkshop.id)));

  if (!matchingWorkshop) {
    throw new Error(`Allocated workshop ${createdWorkshop.id} did NOT appear in staff's My Assignments page!`);
  }
  console.log(`   ✅ MY ASSIGNMENTS VERIFIED! Record found: "${matchingWorkshop.sessionTitle}" (${matchingWorkshop.type}) | ID: ${matchingWorkshop.id}`);

  // 5. Step 4: Clean Up Test Workshop
  console.log("\n4️⃣ Step 4: Cleaning Up Test Workshop Record...");
  await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(createdWorkshop.id)]);
  await query("DELETE FROM workshops WHERE id = $1", [createdWorkshop.id]);
  console.log("   ✅ Cleaned up test workshop.");

  console.log("\n==================================================");
  console.log("🎉 WORKSHOP STAFF ALLOCATION & EMAIL FLOW VERIFIED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

verifyWorkshopStaffFlow().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
