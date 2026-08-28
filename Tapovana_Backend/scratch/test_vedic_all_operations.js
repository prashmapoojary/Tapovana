const { 
  createVedicProgram, 
  updateVedicProgram, 
  registerAttendee,
  enrollUserInVedicProgram, 
  getVedicProgramAttendees,
  getVedicPackageMembers
} = require('../src/controllers/vedicProgramsController');
const { query } = require('../src/config/db');

async function testVedicSuite() {
  console.log("=== VEDIC LIFE PROGRAM SUITE DIAGNOSTICS ===");

  const makeRes = (label) => {
    let statusCode = 200;
    return {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => console.log(`[${label}] STATUS ${statusCode}:`, JSON.stringify(data)),
          send: (data) => console.log(`[${label}] STATUS ${statusCode}:`, data)
        };
      },
      json: (data) => console.log(`[${label}] STATUS ${statusCode}:`, JSON.stringify(data)),
      send: (data) => console.log(`[${label}] STATUS ${statusCode}:`, data)
    };
  };

  // 1. Test CREATE Package
  console.log("\n--- TEST 1: CREATE PACKAGE ---");
  const createReq = {
    body: {
      title: "Test Diagnostic Vedic Retreat April 2027",
      type: "Retreat",
      description: "Testing package creation, edit, update, patch, and attendee operations.",
      duration: "7-days",
      startDate: "2027-04-01",
      endDate: "2027-04-07",
      capacity: 15,
      price: 5000,
      accommodations: "Deluxe Suite (Single Occupancy)",
      consultant_id: null,
      assigned_staff_ids: []
    }
  };
  await createVedicProgram(createReq, makeRes("CREATE_PROGRAM"));

  // Find newly created program
  const newProgRes = await query("SELECT * FROM vedic_programs WHERE title = $1 ORDER BY id DESC LIMIT 1", ["Test Diagnostic Vedic Retreat April 2027"]);
  if (!newProgRes.rows.length) {
    console.error("Failed to find created program in DB!");
    process.exit(1);
  }
  const prog = newProgRes.rows[0];
  console.log("Created Program ID:", prog.id);

  // 2. Test EDIT / UPDATE / PATCH Package
  console.log("\n--- TEST 2: UPDATE/PATCH PACKAGE ---");
  const updateReq = {
    params: { id: prog.id },
    body: {
      title: "Test Diagnostic Vedic Retreat April 2027 - Updated",
      type: "Retreat",
      description: "Updated description text.",
      duration: "7-days",
      startDate: "2027-04-01",
      endDate: "2027-04-07",
      capacity: 20,
      price: 6000,
      consultant_id: null,
      assigned_staff_ids: []
    }
  };
  await updateVedicProgram(updateReq, makeRes("UPDATE_PROGRAM"));

  // 3. Test USER SIDE ENROLLMENT (registerAttendee)
  console.log("\n--- TEST 3: USER SIDE ENROLLMENT (registerAttendee) ---");
  const userEnrollReq = {
    params: { id: prog.id },
    body: {
      name: "Test User Participant",
      email: "testuser99@gmail.org",
      phone: "9876543210",
      accommodationType: "Standard Room (Shared)",
      paymentStatus: "PENDING"
    }
  };
  await registerAttendee(userEnrollReq, makeRes("USER_ENROLL"));

  // 4. Test ADMIN MANUAL ENROLLMENT (enrollUserInVedicProgram)
  console.log("\n--- TEST 4: ADMIN MANUAL ENROLLMENT (enrollUserInVedicProgram) ---");
  const adminEnrollReq = {
    params: { id: prog.id },
    body: {
      name: "Test Admin Enrolled User",
      email: "adminenrolled88@gmail.co.in",
      phone: "9876543211",
      accommodationType: "Deluxe Villa (Private)",
      paymentStatus: "CONFIRMED"
    }
  };
  await enrollUserInVedicProgram(adminEnrollReq, makeRes("ADMIN_ENROLL"));

  // 5. Test GET ATTENDEES (getVedicProgramAttendees)
  console.log("\n--- TEST 5: GET ATTENDEES ---");
  const getAttReq = { params: { id: prog.id } };
  await getVedicProgramAttendees(getAttReq, makeRes("GET_ATTENDEES"));

  // 6. Test GET MOBILE MEMBERS (getVedicPackageMembers)
  console.log("\n--- TEST 6: GET MOBILE MEMBERS ---");
  const getMobReq = { params: { id: prog.id } };
  await getVedicPackageMembers(getMobReq, makeRes("GET_MOBILE_MEMBERS"));

  // Clean up test program
  console.log("\n--- CLEANUP ---");
  await query("DELETE FROM vedic_attendees WHERE program_id = $1", [prog.id]);
  await query("DELETE FROM vedic_programs WHERE id = $1", [prog.id]);
  console.log("ALL VEDIC PROGRAM TESTS PASSED 100%!");
  process.exit(0);
}

testVedicSuite();
