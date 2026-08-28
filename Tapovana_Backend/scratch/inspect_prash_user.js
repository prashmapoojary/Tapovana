const { query } = require('../src/config/db');

async function inspectPrashUser() {
  console.log("=== INSPECTING TEAM MEMBERS AND USERS FOR PRASH POO ===");

  try {
    const tmAll = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, tm.phone, r.name AS role
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
    `);
    console.log("\nALL TEAM MEMBERS:");
    console.table(tmAll.rows);

    const bks = await query(`
      SELECT id, service_name, booking_date, therapist_id, therapist_name, status 
      FROM bookings 
      WHERE therapist_name IS NOT NULL AND therapist_name != ''
    `);
    console.log("\nALL ASSIGNED BOOKINGS:");
    console.table(bks.rows);

    const wss = await query(`
      SELECT id, title, instructor, instructor_id, assigned_staff_ids 
      FROM workshops
    `);
    console.log("\nALL WORKSHOPS:");
    console.table(wss.rows);

    const vps = await query(`
      SELECT id, title, consultant_id, lead_consultant_id, assigned_staff_ids 
      FROM vedic_programs
    `);
    console.log("\nALL VEDIC PROGRAMS:");
    console.table(vps.rows);

  } catch (e) {
    console.error("Error:", e);
  }

  process.exit(0);
}

inspectPrashUser();
