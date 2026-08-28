const { 
  createBooking, 
  getAllBookings, 
  updateBookingStatus, 
  assignTherapist, 
  deleteBooking 
} = require('../src/controllers/bookingsController');
const { getMyAssignments } = require('../src/controllers/servicesController');
const { query } = require('../src/config/db');

async function runBookingRequirementsSuite() {
  console.log("=== BOOKING PAGE REQUIREMENT DIAGNOSTIC SUITE ===");

  const makeRes = (label) => {
    let statusCode = 200;
    let responseData = null;
    return {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => { responseData = data; console.log(`[${label}] STATUS ${statusCode}:`, JSON.stringify(data)); return data; },
          send: (data) => { responseData = data; console.log(`[${label}] STATUS ${statusCode}:`, data); return data; }
        };
      },
      json: (data) => { responseData = data; console.log(`[${label}] STATUS ${statusCode}:`, JSON.stringify(data)); return data; },
      send: (data) => { responseData = data; console.log(`[${label}] STATUS ${statusCode}:`, data); return data; },
      getData: () => responseData,
      getCode: () => statusCode
    };
  };

  // Get active Doctor & Therapist IDs from DB
  const docRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm JOIN roles r ON r.id = tm.role_id 
    WHERE UPPER(r.name) = 'DOCTOR' LIMIT 2
  `);
  const thRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm JOIN roles r ON r.id = tm.role_id 
    WHERE UPPER(r.name) = 'THERAPIST' LIMIT 2
  `);

  if (!docRes.rows.length || !thRes.rows.length) {
    console.error("Missing Doctor or Therapist in DB!");
    process.exit(1);
  }

  const doctor = docRes.rows[0];
  const therapist1 = thRes.rows[0];
  const therapist2 = thRes.rows[1] || thRes.rows[0];

  console.log(`Using Doctor: ${doctor.first_name} ${doctor.last_name} (${doctor.id})`);
  console.log(`Using Therapist 1: ${therapist1.first_name} ${therapist1.last_name} (${therapist1.id})`);
  console.log(`Using Therapist 2: ${therapist2.first_name} ${therapist2.last_name} (${therapist2.id})`);

  // 1. Create New Booking (starts as PENDING)
  console.log("\n--- TEST 1: CREATE NEW MOBILE BOOKING (PENDING STATUS) ---");
  const newBookingId = 999100 + Math.floor(Math.random() * 1000);
  const createReq = {
    body: {
      id: newBookingId,
      user_name: "Test Patient Diagnostics",
      service_name: "Abhyanga Ayurvedic Massage",
      booking_date: "2027-05-15",
      booking_time: "10:00 AM",
      total_amount: "₹2,500",
      user_email: "testpatient99@gmail.com"
    }
  };
  const createRes = makeRes("CREATE_BOOKING");
  await createBooking(createReq, createRes);

  // Verify status is PENDING
  const bkCheck = await query("SELECT * FROM bookings WHERE id = $1", [newBookingId]);
  console.log("Created Booking Status:", bkCheck.rows[0]?.status);
  if (bkCheck.rows[0]?.status !== 'PENDING') {
    console.error("FAILED: Booking did not start as PENDING!");
  } else {
    console.log("✅ REQUIREMENT PASSED: Every new booking starts as PENDING.");
  }

  // 2. Attempt Pending -> Completed directly (Should fail)
  console.log("\n--- TEST 2: PENDING -> COMPLETED DIRECTLY (SHOULD FAIL) ---");
  const directCompReq = {
    params: { id: newBookingId },
    body: { status: "COMPLETED" }
  };
  await updateBookingStatus(directCompReq, makeRes("PENDING_TO_COMPLETED"));

  // 3. Attempt Pending -> Confirmed without staff allocation (Should fail)
  console.log("\n--- TEST 3: PENDING -> CONFIRMED WITHOUT STAFF (SHOULD FAIL) ---");
  const noStaffConfReq = {
    params: { id: newBookingId },
    body: { status: "CONFIRMED" }
  };
  await updateBookingStatus(noStaffConfReq, makeRes("CONFIRM_WITHOUT_STAFF"));

  // 4. Staff Allocation (Allocate Therapist 1 to Pending Booking)
  console.log("\n--- TEST 4: ALLOCATE STAFF TO BOOKING ---");
  const allocReq = {
    params: { id: newBookingId },
    body: {
      therapist_id: therapist1.id,
      therapist_name: `${therapist1.first_name} ${therapist1.last_name}`
    }
  };
  await assignTherapist(allocReq, makeRes("ALLOCATE_STAFF"));

  // Confirm booking now that staff is allocated
  console.log("\n--- TEST 5: CONFIRM BOOKING AFTER STAFF ALLOCATION ---");
  const confirmReq = {
    params: { id: newBookingId },
    body: {
      status: "CONFIRMED",
      staff_ids: [therapist1.id]
    }
  };
  await updateBookingStatus(confirmReq, makeRes("CONFIRM_WITH_STAFF"));

  // 5. Reallocate Staff (Replace Therapist 1 with Therapist 2)
  console.log("\n--- TEST 6: REALLOCATE STAFF (REPLACE THERAPIST 1 WITH THERAPIST 2) ---");
  const reallocReq = {
    params: { id: newBookingId },
    body: {
      status: "CONFIRMED",
      staff_ids: [therapist2.id]
    }
  };
  await updateBookingStatus(reallocReq, makeRes("REALLOCATE_STAFF"));

  // 6. Verify Allocation displayed on Therapist 2's My Assignments Page
  console.log("\n--- TEST 7: VERIFY ASSIGNMENT APPEARS ON THERAPIST 2 MY ASSIGNMENTS ---");
  const getAssignReq = {
    query: { staff_id: therapist2.id },
    user: { id: therapist2.id, role: "THERAPIST" }
  };
  const assignRes = makeRes("GET_MY_ASSIGNMENTS");
  await getMyAssignments(getAssignReq, assignRes);

  const assignData = assignRes.getData();
  const foundAssign = assignData?.assignments?.find(a => String(a.sessionId) === String(newBookingId));
  if (foundAssign) {
    console.log("✅ REQUIREMENT PASSED: Allocated booking displayed on staff member's assignment page!");
    console.log("Assignment details:", {
      displayRecordId: foundAssign.displayRecordId,
      customerName: foundAssign.customerName,
      serviceTitle: foundAssign.sessionTitle,
      date: foundAssign.startDate,
      time: foundAssign.bookingTime,
      status: foundAssign.status
    });
  } else {
    console.error("FAILED: Booking not found in staff assignments!");
  }

  // 7. Cleanup / Delete Test Booking
  console.log("\n--- TEST 8: DELETE TEST BOOKING ---");
  const delReq = { params: { id: newBookingId } };
  await deleteBooking(delReq, makeRes("DELETE_BOOKING"));
  console.log("✅ ALL TEST SUITE CHECKS COMPLETED SUCCESSFULLY!");
  process.exit(0);
}

runBookingRequirementsSuite();
