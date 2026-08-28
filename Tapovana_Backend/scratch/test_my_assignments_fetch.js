const { query } = require('../src/config/db');
const { getMyAssignments } = require('../src/controllers/servicesController');

async function testMyAssignments() {
  console.log("=== TESTING GET MY ASSIGNMENTS FOR STAFF MEMBERS ===");

  try {
    const tmRes = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE UPPER(r.name) IN ('DOCTOR', 'THERAPIST')
      LIMIT 5
    `);

    console.log(`Found ${tmRes.rows.length} staff members to test:`);
    console.table(tmRes.rows);

    for (const staff of tmRes.rows) {
      const req = {
        query: { staff_id: staff.id },
        user: { id: staff.id, email: staff.email, name: `${staff.first_name} ${staff.last_name}` }
      };

      let assignmentsOutput = [];
      const res = {
        status: (code) => res,
        json: (data) => {
          assignmentsOutput = data.assignments || [];
        }
      };

      await getMyAssignments(req, res);
      console.log(`\nStaff: ${staff.first_name} ${staff.last_name} (${staff.role}) | Email: ${staff.email}`);
      console.log(`Total Assignments Found: ${assignmentsOutput.length}`);
      if (assignmentsOutput.length > 0) {
        console.table(assignmentsOutput.map(a => ({
          type: a.type,
          title: a.sessionTitle,
          date: a.startDate,
          time: a.bookingTime,
          customer: a.customerName
        })));
      }
    }

  } catch (e) {
    console.error("Test error:", e);
  }

  process.exit(0);
}

testMyAssignments();
