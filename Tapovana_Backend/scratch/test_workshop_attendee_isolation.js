const { query } = require('../src/config/db');

// Mock email service
const emailService = require('../src/services/emailService');
emailService.sendWorkshopAllocationNotificationEmail = async () => true;

const workshopController = require('../src/controllers/workshopController');

async function verifyAttendeeIsolation() {
  console.log("🌟 --- STARTING STRICT WORKSHOP ATTENDEE ISOLATION TEST --- 🌟\n");

  // 1. Get Doctor/Therapist
  const staffRes = await query(`
    SELECT tm.id FROM team_members tm JOIN roles r ON tm.role_id = r.id WHERE r.name IN ('Doctor', 'Therapist') LIMIT 1
  `);
  const staffId = staffRes.rows[0].id;

  // 2. Create Workshop A & Workshop B
  console.log("1️⃣ Creating Workshop A and Workshop B...");
  const wsARes = await query(
    `INSERT INTO workshops (title, category, instructor, instructor_id, date, time, duration, capacity, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    ['Isolation Workshop Alpha', 'Yoga', 'Doctor', staffId, '2026-12-20', '10:00 AM', 60, 20, 2000, 'Upcoming']
  );
  const wsAId = wsARes.rows[0].id;

  const wsBRes = await query(
    `INSERT INTO workshops (title, category, instructor, instructor_id, date, time, duration, capacity, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING id`,
    ['Isolation Workshop Beta', 'Meditation', 'Doctor', staffId, '2026-12-21', '02:00 PM', 60, 20, 2500, 'Upcoming']
  );
  const wsBId = wsBRes.rows[0].id;

  console.log(`   ✅ Workshop A ID: ${wsAId}`);
  console.log(`   ✅ Workshop B ID: ${wsBId}`);

  // 3. Enroll Attendee 1 in Workshop A
  console.log("\n2️⃣ Enrolling User Alpha (alpha@example.com) in Workshop A...");
  await query(
    `INSERT INTO attendees (workshop_id, name, email, status) VALUES ($1, $2, $3, $4)`,
    [wsAId, 'User Alpha', 'alpha@example.com', 'enrolled']
  );

  // 4. Enroll Attendee 2 in Workshop B
  console.log("3️⃣ Enrolling User Beta (beta@example.com) in Workshop B...");
  await query(
    `INSERT INTO attendees (workshop_id, name, email, status) VALUES ($1, $2, $3, $4)`,
    [wsBId, 'User Beta', 'beta@example.com', 'enrolled']
  );

  // 5. Query Attendees for Workshop A via API controller
  console.log("\n4️⃣ Testing GET Attendees for Workshop A...");
  const reqA = { params: { id: wsAId } };
  const resA = {
    statusCode: 200,
    data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };
  await workshopController.getWorkshopAttendees(reqA, resA);

  const attA = resA.data.attendees;
  console.log(`   Workshop A returned ${attA.length} attendee(s).`);
  if (attA.length !== 1 || attA[0].email !== 'alpha@example.com') {
    throw new Error(`Workshop A isolation failed! Expected ONLY alpha@example.com, got: ${JSON.stringify(attA)}`);
  }
  console.log("   ✅ Workshop A contains ONLY User Alpha!");

  // 6. Query Attendees for Workshop B via API controller
  console.log("\n5️⃣ Testing GET Attendees for Workshop B...");
  const reqB = { params: { id: wsBId } };
  const resB = {
    statusCode: 200,
    data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };
  await workshopController.getWorkshopAttendees(reqB, resB);

  const attB = resB.data.attendees;
  console.log(`   Workshop B returned ${attB.length} attendee(s).`);
  if (attB.length !== 1 || attB[0].email !== 'beta@example.com') {
    throw new Error(`Workshop B isolation failed! Expected ONLY beta@example.com, got: ${JSON.stringify(attB)}`);
  }
  console.log("   ✅ Workshop B contains ONLY User Beta!");

  // 7. Cleanup
  console.log("\n6️⃣ Cleaning up test records...");
  await query('DELETE FROM attendees WHERE workshop_id IN ($1, $2)', [wsAId, wsBId]);
  await query('DELETE FROM workshops WHERE id IN ($1, $2)', [wsAId, wsBId]);
  console.log("   ✅ Test records cleaned up successfully.");

  console.log("\n==================================================");
  console.log("🎉 WORKSHOP ATTENDEE ISOLATION VERIFIED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

verifyAttendeeIsolation().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
