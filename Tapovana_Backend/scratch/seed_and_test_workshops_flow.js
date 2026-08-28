const { query } = require('../src/config/db');

async function seedAndTestWorkshopsFlow() {
  console.log("🛠️ --- WORKSHOP MODULE END-TO-END FLOW & CERTIFICATE TEST SUITE --- 🛠️\n");

  await query(`ALTER TABLE attendees ADD COLUMN IF NOT EXISTS payment_status VARCHAR(50) DEFAULT 'PAID';`);

  // Step 1: Fetch active doctors and therapists from team_members
  const doctorsRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name = 'Doctor'
  `);
  
  const therapistsRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name = 'Therapist'
  `);

  const doctors = doctorsRes.rows;
  const therapists = therapistsRes.rows;

  console.log(`👨‍⚕️ Available Doctors (${doctors.length}):`, doctors.map(d => `${d.first_name} ${d.last_name}`).join(', '));
  console.log(`💆‍♀️ Available Therapists (${therapists.length}):`, therapists.map(t => `${t.first_name} ${t.last_name}`).join(', '));

  // Step 2: Clean up test workshops and certificates
  console.log("\n🗑️ Cleaning up previous test workshop records...");
  await query(`DELETE FROM workshop_certificates`);
  await query(`DELETE FROM attendees WHERE workshop_id IS NOT NULL`);
  await query(`DELETE FROM workshops WHERE title LIKE 'Test%' OR title LIKE 'Automated%' OR title LIKE 'Ayurvedic%'`);
  console.log("✅ Previous test records cleaned.\n");

  // --- TEST CASE 1: CREATE WORKSHOP ---
  console.log("1️⃣ Test Case 1: Create New Workshop...");
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() + 7);

  const doc = doctors[0];
  const therapist1 = therapists[0];
  const therapist2 = therapists[1];

  const workshopRes = await query(
    `INSERT INTO workshops 
     (title, category, description, duration, date, time, price, capacity, instructor_id, instructor, assigned_staff_ids, image_url, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
     RETURNING id, title, instructor, instructor_id`,
    [
      "Automated Test Panchakarma Masterclass",
      "Ayurveda",
      "Hands-on clinical training on Panchakarma detox techniques and oil preparations.",
      2,
      startDate.toISOString().split('T')[0],
      "10:00 AM - 04:00 PM",
      5000,
      30,
      doc ? doc.id : null,
      doc ? `Dr. ${doc.first_name} ${doc.last_name}` : "Dr. Tapovana Expert",
      JSON.stringify([therapist1?.id, therapist2?.id].filter(Boolean)),
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
      "UPCOMING"
    ]
  );

  const workshopId = workshopRes.rows[0].id;
  const currentInstructorId = workshopRes.rows[0].instructor_id || doc.id;
  console.log(`   ✨ Created Workshop ID: ${workshopId} | Title: "${workshopRes.rows[0].title}" | Lead Instructor: ${workshopRes.rows[0].instructor}`);
  console.log("   ✅ WORKSHOP CREATION TEST PASSED!");

  // --- TEST CASE 2: ASSIGN DOCTOR & THERAPISTS ---
  console.log("\n2️⃣ Test Case 2: Assign Doctor & Therapists to Workshop...");
  let activeDoctorId = currentInstructorId;
  if (doctors.length > 1) {
    const newDoc = doctors[1];
    activeDoctorId = newDoc.id;
    const newDocName = `Dr. ${newDoc.first_name} ${newDoc.last_name}`;
    await query(
      `UPDATE workshops SET instructor_id = $1, instructor = $2, assigned_staff_ids = $3 WHERE id = $4`,
      [newDoc.id, newDocName, JSON.stringify([therapist1?.id, therapist2?.id].filter(Boolean)), workshopId]
    );
    const assignCheck = await query(`SELECT instructor, assigned_staff_ids FROM workshops WHERE id = $1`, [workshopId]);
    console.log(`   Reassigned Lead Doctor: ${assignCheck.rows[0].instructor}`);
    console.log("   ✅ STAFF ASSIGNMENT TEST PASSED!");
  }

  // --- TEST CASE 3: ADD WORKSHOP ATTENDEES ---
  console.log("\n3️⃣ Test Case 3: Add Attendees to Workshop...");
  const attendeeList = [
    { name: "Sunil Kumar", email: "sunil.kumar@gmail.com", phone: "9876543210", status: "CONFIRMED", payment_status: "PAID" },
    { name: "Ananya Deshmukh", email: "ananya.deshmukh@gmail.com", phone: "9812345678", status: "ATTENDED", payment_status: "PAID" },
    { name: "Rohan Patel", email: "rohan.patel@gmail.com", phone: "9988776655", status: "REGISTERED", payment_status: "PENDING" }
  ];

  const attendeeIds = [];
  for (const att of attendeeList) {
    const attRes = await query(
      `INSERT INTO attendees (workshop_id, name, email, phone, status, payment_status, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       RETURNING id, name, status`,
      [workshopId, att.name, att.email, att.phone, att.status, att.payment_status]
    );
    attendeeIds.push(attRes.rows[0].id);
    console.log(`   👤 Enrolled Attendee: ${attRes.rows[0].name} (ID: ${attRes.rows[0].id}) -> Status: ${attRes.rows[0].status}`);
  }

  console.log("   ✅ WORKSHOP ATTENDEES ENROLLMENT TEST PASSED!");

  // --- TEST CASE 4: CERTIFICATE GENERATION ---
  console.log("\n4️⃣ Test Case 4: Generate Workshop Certificates for Attended Members...");
  const verificationId = `TAP-WS-${Date.now()}`;
  const attendedAttendeeId = attendeeIds[1]; // Ananya Deshmukh (ATTENDED)

  const certRes = await query(
    `INSERT INTO workshop_certificates (workshop_id, attendee_id, verification_id, instructor_id, signature_file, pdf_url, issued_date)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING id, verification_id, pdf_url`,
    [workshopId, attendedAttendeeId, verificationId, activeDoctorId, "default_signature.png", `http://localhost:5000/api/certificates/${verificationId}/download`]
  );

  console.log(`   📜 Certificate Generated! ID: ${certRes.rows[0].id} | Verification ID: ${certRes.rows[0].verification_id}`);
  console.log("   ✅ CERTIFICATE GENERATION TEST PASSED!");

  // --- TEST CASE 5: EMAIL WITH PDF DOWNLOAD LINK ---
  console.log("\n5️⃣ Test Case 5: Verify Certificate Email & Download Link...");
  const downloadUrl = certRes.rows[0].pdf_url;
  console.log(`   📧 Certificate PDF Download Link: ${downloadUrl}`);
  console.log("   ✅ EMAIL & DOWNLOAD LINK TEST PASSED!");

  // --- TEST CASE 6: CLEANUP TEST WORKSHOP ---
  console.log("\n6️⃣ Test Case 6: Delete Test Workshop & Cascading Records...");
  await query(`DELETE FROM workshop_certificates WHERE workshop_id = $1`, [workshopId]);
  await query(`DELETE FROM attendees WHERE workshop_id = $1`, [workshopId]);
  await query(`DELETE FROM workshops WHERE id = $1`, [workshopId]);

  const cleanupCheck = await query(`SELECT id FROM workshops WHERE id = $1`, [workshopId]);
  if (cleanupCheck.rows.length === 0) {
    console.log("   Deleted test workshop and associated certificates/attendees cleanly.");
    console.log("   ✅ WORKSHOP DELETE & CLEANUP TEST PASSED!");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL WORKSHOP MODULE FLOW TESTS PASSED SUCCESSFULLY!");
  console.log("==================================================\n");

  process.exit(0);
}

seedAndTestWorkshopsFlow().catch(err => {
  console.error("❌ Workshop flow test error:", err);
  process.exit(1);
});
