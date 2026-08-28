const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function cleanDelete() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Identify main admin to keep
    const adminRes = await client.query("SELECT id, email FROM team_members WHERE LOWER(email) = 'prashmapoojary@gmail.com'");
    if (!adminRes.rows.length) {
      throw new Error("Target admin prashmapoojary@gmail.com not found!");
    }
    const adminId = adminRes.rows[0].id;
    console.log("Keeping admin ID:", adminId);

    // 2. Identify team members to delete
    const toDeleteRes = await client.query("SELECT id, email, first_name, last_name FROM team_members WHERE id != $1", [adminId]);
    const deleteIds = toDeleteRes.rows.map(r => r.id);
    console.log(`Found ${deleteIds.length} team members to remove permanently.`);

    // 3. Clear dependent tables safely
    // a. allocations
    const allocDel = await client.query("DELETE FROM allocations WHERE staff_id = ANY($1)", [deleteIds]);
    console.log(`Deleted ${allocDel.rowCount} records from allocations.`);

    // b. login_credentials (by member_id)
    const credDel = await client.query("DELETE FROM login_credentials WHERE member_id = ANY($1)", [deleteIds]);
    console.log(`Deleted ${credDel.rowCount} records from login_credentials.`);

    // c. leaves
    const leavesDel = await client.query("DELETE FROM leaves WHERE staff_id = ANY($1)", [deleteIds]);
    console.log(`Deleted ${leavesDel.rowCount} records from leaves.`);

    // d. vedic_program_staff
    const vpStaffDel = await client.query("DELETE FROM vedic_program_staff WHERE staff_id = ANY($1)", [deleteIds]);
    console.log(`Deleted ${vpStaffDel.rowCount} records from vedic_program_staff.`);

    // e. otp_verification (by member_id)
    const otpDel = await client.query("DELETE FROM otp_verification WHERE member_id = ANY($1)", [deleteIds]);
    console.log(`Deleted ${otpDel.rowCount} records from otp_verification.`);

    // f. Update workshops where instructor_id or assigned_staff_ids reference deleted staff
    const wsUpdate = await client.query(`
      UPDATE workshops 
      SET instructor = NULL, 
          instructor_id = NULL, 
          assigned_staff_ids = '[]'::jsonb, 
          allocation_count = 0 
      WHERE instructor_id = ANY($1) OR assigned_staff_ids ?| $2
    `, [deleteIds, deleteIds]);
    console.log(`Reset instructor allocations in ${wsUpdate.rowCount} workshops.`);

    // g. Update services assigned_staff_ids if any
    const srvUpdate = await client.query(`
      UPDATE services 
      SET assigned_staff_ids = '[]'::jsonb
      WHERE assigned_staff_ids ?| $1
    `, [deleteIds]);
    console.log(`Reset assigned staff in ${srvUpdate.rowCount} services.`);

    // h. Update bookings therapist_id if any
    const bkUpdate = await client.query(`
      UPDATE bookings 
      SET therapist_id = NULL, therapist_name = NULL, status = CASE WHEN status = 'CONFIRMED' THEN 'PENDING' ELSE status END
      WHERE therapist_id = ANY($1)
    `, [deleteIds]);
    console.log(`Reset assigned therapist in ${bkUpdate.rowCount} bookings.`);

    // i. Update created_by references in team_members to point to adminId
    await client.query("UPDATE team_members SET created_by = $1 WHERE created_by != $1 OR created_by IS NULL", [adminId]);

    // 4. Now permanently delete team members except prashmapoojary@gmail.com
    const delRes = await client.query("DELETE FROM team_members WHERE id != $1", [adminId]);
    console.log(`✅ Permanently deleted ${delRes.rowCount} team members from database.`);

    await client.query('COMMIT');

    // Verify remaining team members
    const finalRes = await pool.query("SELECT id, first_name, last_name, email, role_id, status FROM team_members");
    console.log("\n--- REMAINING TEAM MEMBERS IN DB (" + finalRes.rows.length + ") ---");
    console.table(finalRes.rows);

  } catch (err) {
    await client.query('ROLLBACK');
    console.error("❌ Delete Transaction Error:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

cleanDelete();
