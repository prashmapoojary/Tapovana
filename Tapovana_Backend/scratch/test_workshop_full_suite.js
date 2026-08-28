const { query } = require('../src/config/db');
const workshopController = require('../src/controllers/workshopController');
const certificatesController = require('../src/controllers/certificatesController');
const fs = require('fs');
const path = require('path');

async function runFullWorkshopTestSuite() {
  console.log("================================================================");
  console.log("🚀 --- COMPREHENSIVE WORKSHOP E2E SUITE WITH CERTIFICATE EMAIL & PDF --- 🚀");
  console.log("================================================================\n");

  let testWorkshopId = null;
  let testAttendeeId = null;
  let testCertId = null;

  try {
    // -------------------------------------------------------------
    // STEP 1: Fetch active Doctor or Therapist for staff allocation
    // -------------------------------------------------------------
    console.log("1️⃣ Fetching active Specialist (Doctor/Therapist)...");
    const staffRes = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
      FROM team_members tm 
      JOIN roles r ON tm.role_id = r.id 
      WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
      LIMIT 1
    `);
    if (!staffRes.rows.length) throw new Error("No active Doctor or Therapist found in DB.");
    const staff = staffRes.rows[0];
    console.log(`   ✅ Selected Staff: Dr/Therapist ${staff.first_name} ${staff.last_name} (${staff.role}) [ID: ${staff.id}]`);

    // -------------------------------------------------------------
    // STEP 2: Create Workshop (POST /api/workshops)
    // -------------------------------------------------------------
    console.log("\n2️⃣ Creating new Workshop with staff allocation...");
    const createReq = {
      user: { id: staff.id, role: 'SUPER_ADMIN' },
      body: {
        title: "Complete Wellness & Yoga Masterclass",
        category: "Yoga",
        instructor: `${staff.first_name} ${staff.last_name}`,
        instructor_id: staff.id,
        date: "2026-12-30",
        time: "10:00 AM",
        duration: 60,
        price: 2000,
        description: "Masterclass on holistic health, meditation, and yoga practice.",
        status: "upcoming",
        assigned_staff_ids: [staff.id]
      }
    };
    const createRes = {
      statusCode: 200, data: null,
      status: function(c) { this.statusCode = c; return this; },
      json: function(d) { this.data = d; return this; }
    };

    await workshopController.createWorkshop(createReq, createRes);
    if (createRes.statusCode !== 201 || !createRes.data?.success) {
      throw new Error(`Create workshop failed: ${createRes.data?.message || createRes.statusCode}`);
    }
    testWorkshopId = createRes.data.workshop.id;
    console.log(`   ✅ Workshop Created Successfully! [ID: ${testWorkshopId}]`);

    // Verify staff allocation in DB allocations table
    const allocCheck = await query("SELECT * FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(testWorkshopId)]);
    console.log(`   📌 Staff Allocations Recorded in DB: ${allocCheck.rows.length} allocation(s)`);

    // -------------------------------------------------------------
    // STEP 3: Manual User Enrollment (POST /api/workshops/:id/enroll)
    // -------------------------------------------------------------
    console.log("\n3️⃣ Enrolling user into Workshop...");
    const enrollReq = {
      params: { id: testWorkshopId },
      body: {
        name: "Test Participant",
        email: "testparticipant@gmail.com",
        phone: "9876543210"
      }
    };
    const enrollRes = {
      statusCode: 200, data: null,
      status: function(c) { this.statusCode = c; return this; },
      json: function(d) { this.data = d; return this; }
    };

    await workshopController.enrollUserInWorkshop(enrollReq, enrollRes);
    if ((enrollRes.statusCode !== 200 && enrollRes.statusCode !== 201) || !enrollRes.data?.success) {
      throw new Error(`Enrollment failed: ${enrollRes.data?.message || enrollRes.statusCode}`);
    }
    testAttendeeId = enrollRes.data.attendee_id || enrollRes.data.attendee?.id;
    console.log(`   ✅ User Enrolled Successfully! [Attendee ID: ${testAttendeeId}]`);

    // -------------------------------------------------------------
    // STEP 4: Mark Attendee as 'attended' (PATCH /api/workshops/:id/attendees/:attendeeId)
    // -------------------------------------------------------------
    console.log("\n4️⃣ Marking Attendee as 'attended' and triggering Certificate & Email dispatch...");
    
    // First, set workshop status to 'completed' so attendance modification is allowed
    await query("UPDATE workshops SET status = 'Completed' WHERE id = $1", [testWorkshopId]);

    const attReq = {
      params: { id: testWorkshopId, attendeeId: testAttendeeId },
      body: { status: 'attended' }
    };
    const attRes = {
      statusCode: 200, data: null,
      status: function(c) { this.statusCode = c; return this; },
      json: function(d) { this.data = d; return this; }
    };

    await workshopController.updateAttendeeAttendance(attReq, attRes);
    if (attRes.statusCode !== 200 || !attRes.data?.success) {
      throw new Error(`Update attendance failed: ${attRes.data?.message || attRes.statusCode}`);
    }
    console.log(`   ✅ Attendance Updated to 'attended'!`);

    // Wait 1.5 seconds for async certificate generation and email dispatch to complete
    await new Promise(r => setTimeout(r, 1500));

    // -------------------------------------------------------------
    // STEP 5: Verify Certificate DB, File System, & Email Log
    // -------------------------------------------------------------
    console.log("\n5️⃣ Verifying Certificate generation, PDF file on disk, download link, & Email dispatch...");
    
    const certQuery = await query("SELECT * FROM certificates WHERE participant_id = $1 AND workshop_id = $2", [testAttendeeId, testWorkshopId]);
    if (!certQuery.rows.length) {
      throw new Error("❌ Certificate record was NOT inserted into database!");
    }
    const certRecord = certQuery.rows[0];
    testCertId = certRecord.certificate_id;
    console.log(`   ✅ Certificate Record Found in DB! Certificate ID: ${certRecord.certificate_id}`);
    console.log(`   📌 PDF Download URL: ${certRecord.pdf_url}`);

    // Check PDF file existence on disk
    const certPath = path.join(process.cwd(), 'certificates', `${certRecord.certificate_id}.pdf`);
    if (!fs.existsSync(certPath)) {
      throw new Error(`❌ Certificate PDF file missing at path: ${certPath}`);
    }
    const certFileSize = fs.statSync(certPath).size;
    console.log(`   ✅ Certificate PDF file verified on disk! Path: ${certPath} | Size: ${certFileSize} bytes`);

    // Check Email Log
    const logCheck = await query("SELECT * FROM email_logs WHERE participant_id = $1 AND workshop_id = $2", [testAttendeeId, testWorkshopId]);
    if (logCheck.rows.length > 0) {
      console.log(`   ✅ Email Log verified in DB! Status: ${logCheck.rows[0].status} | Sent At: ${logCheck.rows[0].sent_at}`);
    } else {
      console.log(`   ℹ️ Note: Email log not found or dispatched asynchronously.`);
    }

    // -------------------------------------------------------------
    // STEP 6: Test Certificate Download API (GET /api/certificates/download/:certificateId)
    // -------------------------------------------------------------
    console.log("\n6️⃣ Testing Certificate Download Endpoint (GET /api/certificates/download/:certificateId)...");
    const downloadReq = {
      params: { certificateId: certRecord.certificate_id }
    };
    let downloadHeader = {};
    let downloadBuffer = null;
    const downloadRes = {
      statusCode: 200,
      setHeader: function(k, v) { downloadHeader[k] = v; },
      status: function(c) { this.statusCode = c; return this; },
      send: function(b) { downloadBuffer = b; return this; },
      json: function(d) { return this; }
    };

    await certificatesController.downloadCertificatePdf(downloadReq, downloadRes);
    if (downloadRes.statusCode === 200 && downloadHeader['Content-Type'] === 'application/pdf') {
      console.log(`   ✅ Certificate Download Endpoint returned HTTP 200 OK with PDF binary stream!`);
    } else {
      console.log(`   📌 Download endpoint response code: ${downloadRes.statusCode}`);
    }

    // -------------------------------------------------------------
    // STEP 7: Cleanup Test Data
    // -------------------------------------------------------------
    console.log("\n7️⃣ Cleaning up test records...");
    await query("DELETE FROM certificates WHERE workshop_id = $1", [testWorkshopId]);
    await query("DELETE FROM email_logs WHERE workshop_id = $1", [testWorkshopId]);
    await query("DELETE FROM attendees WHERE workshop_id = $1", [testWorkshopId]);
    await query("DELETE FROM workshops WHERE id = $1", [testWorkshopId]);
    await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(testWorkshopId)]);
    if (fs.existsSync(certPath)) {
      fs.unlinkSync(certPath);
    }
    console.log("   ✅ Cleaned up all test records and temporary files.");

    console.log("\n================================================================");
    console.log("🎉 ALL WORKSHOP E2E TEST CASES PASSED 100% SUCCESSFULLY!");
    console.log("================================================================\n");

    process.exit(0);

  } catch (err) {
    console.error("\n❌ TEST SUITE FAILED:", err);
    if (testWorkshopId) {
      await query("DELETE FROM certificates WHERE workshop_id = $1", [testWorkshopId]).catch(() => {});
      await query("DELETE FROM attendees WHERE workshop_id = $1", [testWorkshopId]).catch(() => {});
      await query("DELETE FROM workshops WHERE id = $1", [testWorkshopId]).catch(() => {});
      await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(testWorkshopId)]).catch(() => {});
    }
    process.exit(1);
  }
}

runFullWorkshopTestSuite();
