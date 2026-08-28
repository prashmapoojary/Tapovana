const { query } = require('../src/config/db');

async function fixPrashAssignmentsDB() {
  console.log("=== FIXING DATABASE ASSIGNMENT RECORDS FOR PRASH POO ===");

  try {
    const prashUuid = '4dd67d95-ff18-4393-91e5-16af20e71fd2';

    // 1. Update Bookings for prash poo
    const bkUpdate = await query(`
      UPDATE bookings 
      SET therapist_id = $1::uuid, therapist_name = 'prash poo', updated_at = NOW()
      WHERE therapist_id = '4a089107-5e16-470c-a744-389bbe82bef2'
         OR LOWER(therapist_name) LIKE '%prash%'
         OR LOWER(therapist_name) LIKE '%poo%'
      RETURNING id, service_name, therapist_name, therapist_id
    `, [prashUuid]);
    console.log(`Updated ${bkUpdate.rows.length} Bookings for Prash Poo:`);
    console.table(bkUpdate.rows);

    // 2. Update Workshops for prash poo
    const wsUpdate = await query(`
      UPDATE workshops 
      SET instructor_id = $1::uuid, instructor = 'prash poo', assigned_staff_ids = jsonb_build_array($1::text), updated_at = NOW()
      WHERE instructor_id = '4a089107-5e16-470c-a744-389bbe82bef2'
         OR LOWER(instructor) LIKE '%prash%'
         OR LOWER(instructor) LIKE '%poo%'
      RETURNING id, title, instructor, instructor_id
    `, [prashUuid]);
    console.log(`Updated ${wsUpdate.rows.length} Workshops for Prash Poo:`);
    console.table(wsUpdate.rows);

    // 3. Update Vedic Programs for prash poo
    const vpUpdate = await query(`
      UPDATE vedic_programs 
      SET lead_consultant_id = $1::uuid, consultant_id = $1::uuid, assigned_staff_ids = jsonb_build_array($1::text), updated_at = NOW()
      WHERE lead_consultant_id = '4a089107-5e16-470c-a744-389bbe82bef2'
         OR consultant_id = '4a089107-5e16-470c-a744-389bbe82bef2'
      RETURNING id, title, lead_consultant_id
    `, [prashUuid]);
    console.log(`Updated ${vpUpdate.rows.length} Vedic Programs for Prash Poo:`);
    console.table(vpUpdate.rows);

    console.log("\nDATABASE FIX COMPLETED SUCCESSFULLY!");

  } catch (e) {
    console.error("DB Fix error:", e);
  }

  process.exit(0);
}

fixPrashAssignmentsDB();
