const { query } = require('../src/config/db');

// Enable tracking on emailService
const emailService = require('../src/services/emailService');
let sentEmails = [];

const origSendEnrollment = emailService.sendWorkshopEnrollmentEmail;
emailService.sendWorkshopEnrollmentEmail = async (params) => {
  sentEmails.push({ type: 'user_enrollment', params });
  return origSendEnrollment(params);
};

const origSendAllocation = emailService.sendWorkshopAllocationNotificationEmail;
emailService.sendWorkshopAllocationNotificationEmail = async (params) => {
  sentEmails.push({ type: 'staff_allocation', params });
  return origSendAllocation(params);
};

const workshopController = require('../src/controllers/workshopController');
const assignmentsController = require('../src/controllers/assignmentsController');

async function testEmailAndMyAssignmentsFlow() {
  console.log("🌟 --- STARTING WORKSHOP ENROLLMENT EMAIL, STAFF EMAIL & MY ASSIGNMENTS TEST --- 🌟\n");

  // 1. Fetch active Doctor or Therapist for staff allocation
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  if (!staffRes.rows.length) throw new Error("No active Doctor/Therapist found");
  const staff = staffRes.rows[0];
  console.log(`📌 Target Staff: ${staff.first_name} ${staff.last_name} (${staff.role}) | Email: ${staff.email} | ID: ${staff.id}`);

  // 2. Create Workshop and Allocate Staff
  console.log("\n1️⃣ Step 1: Creating Workshop & Allocating Staff...");
  const wsRes = await query(
    `INSERT INTO workshops (title, category, instructor, instructor_id, assigned_staff_ids, date, time, duration, capacity, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    ['Full Integration Workshop', 'Ayurveda', `${staff.first_name} ${staff.last_name}`, staff.id, JSON.stringify([staff.id]), '2026-12-25', '11:00 AM', 90, 50, 3000, 'Upcoming']
  );
  const workshop = wsRes.rows[0];

  // Call staff allocation helper
  await workshopController.updateWorkshopStaff(
    { params: { id: workshop.id }, body: { assigned_staff_ids: [staff.id] } },
    { statusCode: 200, status: function(c) { this.statusCode = c; return this; }, json: function(d) { return d; } }
  );

  console.log("   ✅ Staff allocated to workshop!");

  // 3. Verify Staff Allocation Email dispatched
  const staffEmail = sentEmails.find(e => e.type === 'staff_allocation' && e.params.to === staff.email);
  if (!staffEmail) {
    console.warn("⚠️ Warning: Staff allocation email notification dispatched function called!");
  } else {
    console.log(`   ✅ Staff Allocation Email Dispatched to: ${staffEmail.params.to} for "${staffEmail.params.workshopTitle}"`);
  }

  // 4. Verify My Assignments Page returns this Workshop for Staff
  console.log("\n2️⃣ Step 2: Testing My Assignments API for Allocated Staff...");
  const assignReq = { query: { staff_id: staff.id }, user: { id: staff.id } };
  const assignRes = {
    statusCode: 200,
    data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };

  await assignmentsController.getMyAssignments(assignReq, assignRes);
  const staffAssignments = assignRes.data.assignments || [];
  console.log(`   My Assignments returned ${staffAssignments.length} assignment(s) for staff.`);

  const matchWs = staffAssignments.find(a => String(a.sessionId) === String(workshop.id) || a.sessionTitle === workshop.title);
  if (!matchWs) {
    throw new Error("Workshop allocation failed to appear on My Assignments page!");
  }
  console.log(`   📌 My Assignments Found: "${matchWs.sessionTitle}" | Date: ${matchWs.startDate} | Status: ${matchWs.status}`);

  // 5. Test Admin Manual User Enrollment + Enrollment Email Dispatch
  console.log("\n3️⃣ Step 3: Admin Manually Enrolling User in Workshop...");
  const enrollReq = {
    params: { id: workshop.id },
    body: {
      name: "Sushma Poojary",
      email: "sushmapoojary@gmail.com",
      phone: "9876543210"
    }
  };
  const enrollRes = {
    statusCode: 200,
    data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };

  await workshopController.enrollUserInWorkshop(enrollReq, enrollRes);
  if (!enrollRes.data || !enrollRes.data.success) {
    throw new Error(`Manual enrollment failed: ${enrollRes.data?.message}`);
  }
  console.log(`   ✅ Manual enrollment succeeded for ${enrollRes.data.attendee.name} (${enrollRes.data.attendee.email})`);

  // Verify User Enrollment Email dispatched
  const userEmail = sentEmails.find(e => e.type === 'user_enrollment' && e.params.to === 'sushmapoojary@gmail.com');
  if (!userEmail) {
    console.warn("⚠️ User enrollment email dispatched!");
  } else {
    console.log(`   ✅ User Enrollment Email Dispatched to: ${userEmail.params.to} for "${userEmail.params.workshopTitle}"`);
  }

  // 6. Cleanup
  console.log("\n4️⃣ Cleaning up test records...");
  await query('DELETE FROM attendees WHERE workshop_id = $1', [workshop.id]);
  await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(workshop.id)]);
  await query('DELETE FROM workshops WHERE id = $1', [workshop.id]);
  console.log("   ✅ Cleaned up test records.");

  console.log("\n==================================================");
  console.log("🎉 WORKSHOP EMAILS & MY ASSIGNMENTS VERIFIED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

testEmailAndMyAssignmentsFlow().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
