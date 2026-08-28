const { query } = require('../src/config/db');

async function debugPrashPooAssignments() {
  console.log("=== DEBUGGING ASSIGNMENTS FOR PRASH POO ===");

  try {
    // 1. Check team_members row for prash poo
    const tmRes = await query(`
      SELECT id, first_name, last_name, email, phone, role_id 
      FROM team_members 
      WHERE LOWER(first_name) LIKE '%prash%' 
         OR LOWER(last_name) LIKE '%poo%'
         OR LOWER(email) LIKE '%prash%'
         OR LOWER(email) LIKE '%poo%'
    `);
    console.log("\n--- TEAM MEMBERS MATCHES ---");
    console.table(tmRes.rows);

    if (tmRes.rows.length === 0) {
      console.log("No team member found for prash poo!");
      process.exit(0);
    }

    const prash = tmRes.rows[0];
    const prashId = prash.id;
    const fullName = `${prash.first_name || ''} ${prash.last_name || ''}`.trim();
    const email = prash.email || '';

    console.log(`\nTesting with Staff ID: ${prashId} | Name: "${fullName}" | Email: "${email}"`);

    // 2. Check Bookings
    const bkRes = await query(`
      SELECT id, service_name, booking_date, therapist_id, therapist_name, user_name, status 
      FROM bookings 
      WHERE therapist_id = $1 
         OR (therapist_name IS NOT NULL AND (LOWER(therapist_name) LIKE '%prash%' OR LOWER(therapist_name) LIKE '%poo%'))
    `, [prashId]);
    console.log(`\n--- BOOKINGS MATCHES (${bkRes.rows.length}) ---`);
    console.table(bkRes.rows);

    // 3. Check Workshops
    const wsRes = await query(`
      SELECT id, title, instructor, instructor_id, assigned_staff_ids 
      FROM workshops 
      WHERE instructor_id = $1 
         OR (instructor IS NOT NULL AND (LOWER(instructor) LIKE '%prash%' OR LOWER(instructor) LIKE '%poo%'))
         OR assigned_staff_ids ?| ARRAY[$1::text]
    `, [prashId]);
    console.log(`\n--- WORKSHOPS MATCHES (${wsRes.rows.length}) ---`);
    console.table(wsRes.rows);

    // 4. Check Vedic Programs
    const vpRes = await query(`
      SELECT id, title, consultant_id, lead_consultant_id, assigned_staff_ids 
      FROM vedic_programs 
      WHERE consultant_id = $1 
         OR lead_consultant_id = $1
         OR assigned_staff_ids ?| ARRAY[$1::text]
    `, [prashId]);
    console.log(`\n--- VEDIC PROGRAMS MATCHES (${vpRes.rows.length}) ---`);
    console.table(vpRes.rows);

    // 5. Check Allocations table
    const allocRes = await query(`
      SELECT id, staff_id, type, session_title, start_date, status 
      FROM allocations 
      WHERE staff_id = $1 
         OR session_title ILIKE '%prash%'
    `, [prashId]);
    console.log(`\n--- CENTRAL ALLOCATIONS MATCHES (${allocRes.rows.length}) ---`);
    console.table(allocRes.rows);

  } catch (e) {
    console.error("Debug error:", e);
  }

  process.exit(0);
}

debugPrashPooAssignments();
