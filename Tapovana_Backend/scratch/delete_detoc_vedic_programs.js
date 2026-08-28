const { query } = require('../src/config/db');
const { syncStaffMemberStatus } = require('../src/utils/conflictChecker');

async function deleteDetocPrograms() {
  console.log("=== DELETING VEDIC LIFE PROGRAMS: IDs 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 67 ===");

  const targetIds = [55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 67];

  try {
    // 1. Find all affected staff IDs to sync availability status afterwards
    const staffToSync = new Set();

    for (const id of targetIds) {
      const pRes = await query(`SELECT lead_consultant_id FROM vedic_programs WHERE id = $1`, [id]);
      if (pRes.rows.length && pRes.rows[0].lead_consultant_id) {
        staffToSync.add(pRes.rows[0].lead_consultant_id);
      }

      const sRes = await query(`SELECT staff_id FROM vedic_program_staff WHERE program_id = $1`, [id]);
      for (const r of sRes.rows) {
        staffToSync.add(r.staff_id);
      }

      const aRes = await query(`SELECT staff_id FROM allocations WHERE session_id = $1 AND type = 'vedic_program'`, [String(id)]);
      for (const r of aRes.rows) {
        staffToSync.add(r.staff_id);
      }
    }

    // 2. Delete related records
    for (const id of targetIds) {
      await query(`DELETE FROM allocations WHERE session_id = $1 AND type = 'vedic_program'`, [String(id)]);
      await query(`DELETE FROM allocations WHERE id LIKE $1`, [`vp-alloc-${id}-%`]);
      await query(`DELETE FROM vedic_program_staff WHERE program_id = $1`, [id]);
      await query(`DELETE FROM vedic_attendees WHERE program_id = $1`, [id]);
      await query(`DELETE FROM vedic_programs WHERE id = $1`, [id]);
      console.log(`Successfully deleted Vedic Program ID ${id} ("detoc")`);
    }

    // 3. Resync staff member availability status
    console.log(`\nResyncing availability status for ${staffToSync.size} staff members...`);
    for (const staffId of staffToSync) {
      await syncStaffMemberStatus(staffId);
    }

    // 4. Verify remaining Vedic programs count
    const remaining = await query(`SELECT id, title, type, price, start_date, end_date FROM vedic_programs ORDER BY id ASC`);
    console.log(`\nREMAINING VEDIC PROGRAMS IN DATABASE (${remaining.rows.length}):`);
    console.table(remaining.rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      price: r.price,
      startDate: r.start_date ? r.start_date.toISOString().split('T')[0] : null,
      endDate: r.end_date ? r.end_date.toISOString().split('T')[0] : null
    })));

  } catch (e) {
    console.error("Error during deletion:", e);
  }

  process.exit(0);
}

deleteDetocPrograms();
