const { query } = require('../src/config/db');

async function inspectAndDeallocate() {
  console.log("=== INSPECTING BOOKINGS, ALLOCATIONS, WORKSHOPS, VEDIC PROGRAMS FOR ANANYA SHETTY & SUSHMA SALIAN ===");

  try {
    // 1. Find team member IDs for Ananya Shetty and Sushma Salian
    const tmRes = await query(`
      SELECT id, first_name, last_name, email 
      FROM team_members 
      WHERE LOWER(CONCAT(first_name, ' ', last_name)) LIKE '%ananya%shetty%'
         OR LOWER(CONCAT(first_name, ' ', last_name)) LIKE '%sushma%salian%'
         OR LOWER(email) LIKE '%ananya%'
         OR LOWER(email) LIKE '%sushma%'
    `);

    console.log(`\nFound Team Members:`);
    console.table(tmRes.rows);

    const staffIds = tmRes.rows.map(r => r.id);
    const staffNames = tmRes.rows.map(r => `${r.first_name} ${r.last_name}`);

    // 2. Inspect Bookings
    const bkRes = await query(`
      SELECT id, service_name, booking_date, therapist_id, therapist_name, status 
      FROM bookings 
      WHERE therapist_id = ANY($1::uuid[]) 
         OR LOWER(therapist_name) LIKE '%ananya%shetty%' 
         OR LOWER(therapist_name) LIKE '%sushma%salian%'
    `, [staffIds]);
    console.log(`\nBookings assigned to Ananya Shetty or Sushma Salian: ${bkRes.rows.length}`);
    console.table(bkRes.rows);

    // 3. Inspect Allocations
    const allocRes = await query(`
      SELECT id, staff_id, type, session_title, start_date, end_date, status 
      FROM allocations 
      WHERE staff_id = ANY($1::uuid[])
    `, [staffIds]);
    console.log(`\nAllocations for Ananya Shetty or Sushma Salian: ${allocRes.rows.length}`);
    console.table(allocRes.rows);

    // 4. Inspect Workshops
    const wsRes = await query(`
      SELECT id, title, instructor, instructor_id, assigned_staff_ids 
      FROM workshops 
      WHERE instructor_id = ANY($1::uuid[]) 
         OR LOWER(instructor) LIKE '%ananya%shetty%'
         OR LOWER(instructor) LIKE '%sushma%salian%'
         OR assigned_staff_ids ?| $2::text[]
    `, [staffIds, staffIds.map(String)]);
    console.log(`\nWorkshops for Ananya Shetty or Sushma Salian: ${wsRes.rows.length}`);
    console.table(wsRes.rows);

    // 5. Inspect Vedic Programs
    const vpRes = await query(`
      SELECT id, title, consultant_id, lead_consultant_id, assigned_staff_ids, start_date, end_date 
      FROM vedic_programs 
      WHERE consultant_id = ANY($1::uuid[]) 
         OR lead_consultant_id = ANY($1::uuid[])
         OR assigned_staff_ids ?| $2::text[]
    `, [staffIds, staffIds.map(String)]);
    console.log(`\nVedic Programs for Ananya Shetty or Sushma Salian: ${vpRes.rows.length}`);
    console.table(vpRes.rows);

  } catch (e) {
    console.error("Inspection error:", e);
  }

  process.exit(0);
}

inspectAndDeallocate();
