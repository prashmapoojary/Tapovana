const { query } = require('../src/config/db');

// Mock email service to prevent SMTP timeouts during verification
const emailService = require('../src/services/emailService');
emailService.sendVedicStaffAssignmentEmail = async () => true;
emailService.sendVedicRegistrationEmail = async () => true;
emailService.sendVedicAdminRegistrationNotification = async () => true;

const vedicController = require('../src/controllers/vedicProgramsController');

async function verifyVedicLifeSpecification() {
  console.log("🌟 --- STARTING TAPOVANA VEDIC LIFE MODULE MASTER SPECIFICATION VERIFICATION --- 🌟\n");

  // 1. Fetch Doctor/Therapist for lead consultant
  const doctorRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);

  if (doctorRes.rows.length === 0) {
    throw new Error("No active Doctor or Therapist found for lead consultant.");
  }
  const leadDoctor = doctorRes.rows[0];
  console.log(`👨‍⚕️ Lead Consultant: Dr. ${leadDoctor.first_name} ${leadDoctor.last_name} (${leadDoctor.id})`);

  // 2. Step 1: Create Vedic Life Program with non-conflicting dates
  console.log("\n1️⃣ Step 1: Creating New Vedic Life Program in Database...");
  const startDate = "2026-11-01";
  const endDate = "2026-11-08";

  const createReq = {
    body: {
      title: "Master Specification Ayurveda & Panchakarma Retreat",
      type: "Retreat",
      description: "Comprehensive 7-day Panchakarma & Vedic Life Wellness Immersion",
      duration: "7-days",
      startDate: startDate,
      endDate: endDate,
      capacity: 15,
      price: 18000,
      consultant_id: leadDoctor.id,
      accommodations: "Flora Beauty Suite",
      services: ["Mukha Lepam", "Kumkumadi Massage"],
      languages: ["English", "Hindi"]
    }
  };

  const createRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await vedicController.createVedicProgram(createReq, createRes);
  if (!createRes.data || !createRes.data.success) {
    throw new Error(`Failed to create program: ${createRes.data?.message}`);
  }

  const createdProgram = createRes.data.program;
  console.log(`   ✅ Created Program ID: ${createdProgram.id} | Title: "${createdProgram.title}" | Price: ₹${createdProgram.price}`);

  // 3. Step 2: Edit Vedic Life Program (updating same record)
  console.log("\n2️⃣ Step 2: Editing Vedic Life Program (Pre-fill & Update)...");
  const editReq = {
    params: { id: createdProgram.id },
    body: {
      title: "Updated Master Specification Panchakarma Retreat",
      price: 20000,
      capacity: 20
    }
  };
  const editRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await vedicController.updateVedicProgram(editReq, editRes);
  if (!editRes.data || !editRes.data.success) {
    throw new Error(`Failed to update program: ${editRes.data?.message}`);
  }
  console.log(`   ✅ Updated Program ID: ${createdProgram.id} | New Title: "${editRes.data.program.title}" | New Price: ₹${editRes.data.program.price}`);

  // 4. Step 3: Dual Enrollment (Mobile Enrollment + Admin Manual Enrollment)
  console.log("\n3️⃣ Step 3: Testing Dual Enrollment (Mobile + Admin side)...");
  
  // Mobile side enrollment
  const mobileReq = {
    body: {
      program_id: createdProgram.id,
      user: { name: "Rahul Mobile User", email: "rahul.mobile@tapovana.com", phone: "9876543210" },
      accommodationType: "Flora Suite",
      paymentStatus: "PAID",
      status: "CONFIRMED"
    }
  };
  const mobileRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };
  await vedicController.registerAttendeeFromMobile(mobileReq, mobileRes);
  console.log(`   ✅ Mobile Registration Response: ${mobileRes.data?.message}`);

  // Admin side enrollment
  const adminReq = {
    params: { id: createdProgram.id },
    body: {
      program_id: createdProgram.id,
      user: { name: "Priya Admin User", email: "priya.admin@tapovana.com", phone: "9123456789" },
      accommodationType: "Luxury Villa",
      paymentStatus: "PAID",
      status: "CONFIRMED"
    }
  };
  const adminRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };
  await vedicController.enrollUserInVedicProgram(adminReq, adminRes);
  console.log(`   ✅ Admin Manual Enrollment Response: ${adminRes.data?.message}`);

  // 5. Step 4: Fetch Merged Attendees for Program directly from DB
  console.log("\n4️⃣ Step 4: Fetching Merged Attendees List for Program ID...");
  const attDbRes = await query("SELECT * FROM vedic_attendees WHERE program_id = $1 ORDER BY created_at DESC", [createdProgram.id]);

  const attendees = attDbRes.rows || [];
  console.log(`   Total Merged Attendees Count in Database: ${attendees.length}`);
  attendees.forEach(a => {
    console.log(`   📌 Attendee: "${a.name}" (${a.email}) | Tier: ${a.membership_tier} | Orig: ${a.original_price} | Final: ${a.final_price} | Status: ${a.status}`);
  });

  const hasRahul = attendees.some(a => a.name.includes("Rahul"));
  const hasPriya = attendees.some(a => a.name.includes("Priya"));
  if (!hasRahul || !hasPriya) {
    throw new Error("Mobile and Admin enrollments failed to merge into single attendees list!");
  }
  console.log("   ✅ DUAL ENROLLMENT MERGER PASSED!");

  // 6. Step 5: Clean Up / Delete Vedic Life Program
  console.log("\n5️⃣ Step 5: Deleting Test Vedic Life Program from Database...");
  await query("DELETE FROM vedic_attendees WHERE program_id = $1", [createdProgram.id]);
  await query("DELETE FROM vedic_packages_members WHERE program_id = $1", [createdProgram.id]);

  const delReq = { params: { id: createdProgram.id } };
  const delRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await vedicController.deleteVedicProgram(delReq, delRes);
  console.log(`   ✅ Delete Response: ${delRes.data?.message}`);

  // Verify deletion
  const checkDeleted = await query("SELECT 1 FROM vedic_programs WHERE id = $1", [createdProgram.id]);
  if (checkDeleted.rows.length > 0) {
    throw new Error("Program record still exists in database after deletion!");
  }
  console.log("   ✅ DATABASE PERSISTENT DELETION VERIFIED!");

  console.log("\n==================================================");
  console.log("🎉 ALL VEDIC LIFE MODULE REQUIREMENTS VERIFIED & PASSED!");
  console.log("==================================================\n");

  process.exit(0);
}

verifyVedicLifeSpecification().catch(err => {
  console.error("❌ Vedic Life verification error:", err);
  process.exit(1);
});
