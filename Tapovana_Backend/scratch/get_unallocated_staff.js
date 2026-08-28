const { query } = require('../src/config/db');

async function getUnallocatedStaff() {
  console.log("=== CHECKING UNALLOCATED / AVAILABLE STAFF MEMBERS ===");

  try {
    const tmRes = await query(`
      SELECT 
        tm.id, 
        CONCAT(tm.first_name, ' ', tm.last_name) AS name, 
        tm.email, 
        tm.phone, 
        r.name AS role, 
        tm.status,
        tm.availability_status
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE tm.status = 'active'
      ORDER BY r.name, tm.first_name
    `);

    // Check active allocations count for each staff from central allocations table
    const unallocated = [];
    const allocated = [];

    for (const staff of tmRes.rows) {
      const allocCountRes = await query(`
        SELECT COUNT(*) AS count 
        FROM allocations 
        WHERE staff_id = $1 AND status IN ('assigned', 'active')
      `, [staff.id]);

      const activeAllocCount = parseInt(allocCountRes.rows[0].count, 10);

      const staffInfo = {
        name: staff.name,
        role: staff.role,
        email: staff.email,
        phone: staff.phone || 'N/A',
        availabilityStatus: activeAllocCount === 0 ? 'Available' : 'Allocated',
        activeSessions: activeAllocCount
      };

      if (activeAllocCount === 0) {
        unallocated.push(staffInfo);
      } else {
        allocated.push(staffInfo);
      }
    }

    console.log(`\n================ UNALLOCATED STAFF (${unallocated.length}) ================`);
    console.table(unallocated);

    console.log(`\n================ ALLOCATED STAFF (${allocated.length}) ================`);
    console.table(allocated);

  } catch (e) {
    console.error("Error checking staff allocation:", e);
  }

  process.exit(0);
}

getUnallocatedStaff();
