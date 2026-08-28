const { query } = require('../src/config/db');

async function executeDeallocation() {
  console.log("=== EXECUTING DEALLOCATION FOR ANANYA SHETTY & SUSHMA SALIAN ===");

  try {
    const sushmaId = 'cd0e306f-b287-4221-b5cd-a65f2ef5c40f';
    const ananyaId = '0eaca269-ef5c-454f-9bb1-28ebfb67a8a9';

    // 1. Clear lead_consultant_id and consultant_id in vedic_programs for Sushma Salian & Ananya Shetty
    const vpResult = await query(`
      UPDATE vedic_programs 
      SET lead_consultant_id = NULL, consultant_id = NULL, updated_at = NOW()
      WHERE lead_consultant_id IN ($1, $2) OR consultant_id IN ($1, $2)
      RETURNING id, title
    `, [sushmaId, ananyaId]);
    console.log(`Deallocated from ${vpResult.rows.length} Vedic Life Programs:`);
    console.table(vpResult.rows);

    // 2. Clear instructor_id and instructor in workshops for Sushma Salian & Ananya Shetty
    const wsResult = await query(`
      UPDATE workshops 
      SET instructor_id = NULL, instructor = NULL, updated_at = NOW()
      WHERE instructor_id IN ($1, $2) 
         OR LOWER(instructor) LIKE '%sushma%salian%'
         OR LOWER(instructor) LIKE '%ananya%shetty%'
      RETURNING id, title
    `, [sushmaId, ananyaId]);
    console.log(`Deallocated from ${wsResult.rows.length} Workshops:`);
    console.table(wsResult.rows);

    // 3. Clear therapist_id and therapist_name in bookings for Sushma Salian & Ananya Shetty
    const bkResult = await query(`
      UPDATE bookings 
      SET therapist_id = NULL, therapist_name = NULL, updated_at = NOW()
      WHERE therapist_id IN ($1, $2) 
         OR LOWER(therapist_name) LIKE '%sushma%salian%'
         OR LOWER(therapist_name) LIKE '%ananya%shetty%'
      RETURNING id, service_name, user_name
    `, [sushmaId, ananyaId]);
    console.log(`Deallocated from ${bkResult.rows.length} Bookings:`);
    console.table(bkResult.rows);

    // 4. Delete allocations records for Sushma Salian & Ananya Shetty
    const allocResult = await query(`
      DELETE FROM allocations 
      WHERE staff_id IN ($1, $2)
      RETURNING id, type, session_title
    `, [sushmaId, ananyaId]);
    console.log(`Deleted ${allocResult.rows.length} records from central allocations table:`);
    console.table(allocResult.rows);

    console.log("\nSUCCESS: Deallocation completed cleanly for Sushma Salian and Ananya Shetty only!");

  } catch (e) {
    console.error("Deallocation error:", e);
  }

  process.exit(0);
}

executeDeallocation();
