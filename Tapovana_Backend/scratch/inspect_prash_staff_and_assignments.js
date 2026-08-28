const { query } = require('../src/config/db');

async function inspectPrashStaffAndAssignments() {
  console.log("=== INSPECTING TEAM MEMBERS MATCHING PRASH / PRASHMA ===");

  try {
    const team = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE LOWER(tm.first_name) LIKE '%prash%'
         OR LOWER(tm.last_name) LIKE '%prash%'
         OR LOWER(tm.last_name) LIKE '%poo%'
         OR LOWER(tm.last_name) LIKE '%salian%'
         OR LOWER(tm.email) LIKE '%prash%'
    `);

    console.table(team.rows);

    for (const t of team.rows) {
      console.log(`\n--- ASSIGNMENTS FOR ${t.first_name} ${t.last_name} (ID: ${t.id}, Email: ${t.email}) ---`);
      
      const allocs = await query(`SELECT * FROM allocations WHERE staff_id = $1`, [t.id]);
      console.log(`Allocations count: ${allocs.rows.length}`);
      if (allocs.rows.length) console.table(allocs.rows);

      const bks = await query(`
        SELECT id, service_name, booking_date, booking_time, therapist_id, therapist_name, status 
        FROM bookings 
        WHERE therapist_id = $1 
           OR LOWER(therapist_name) LIKE $2
      `, [t.id, `%${t.first_name.toLowerCase()}%`]);
      console.log(`Bookings count: ${bks.rows.length}`);
      if (bks.rows.length) console.table(bks.rows);

      const wss = await query(`
        SELECT id, title, date, time, instructor_id, instructor 
        FROM workshops 
        WHERE instructor_id = $1 
           OR LOWER(instructor) LIKE $2
      `, [t.id, `%${t.first_name.toLowerCase()}%`]);
      console.log(`Workshops count: ${wss.rows.length}`);
      if (wss.rows.length) console.table(wss.rows);

      const vps = await query(`
        SELECT id, title, start_date, end_date, lead_consultant_id 
        FROM vedic_programs 
        WHERE lead_consultant_id = $1 
           OR consultant_id = $1
      `, [t.id]);
      console.log(`Vedic Programs count: ${vps.rows.length}`);
      if (vps.rows.length) console.table(vps.rows);
    }

  } catch (e) {
    console.error("Error inspecting:", e);
  }

  process.exit(0);
}

inspectPrashStaffAndAssignments();
