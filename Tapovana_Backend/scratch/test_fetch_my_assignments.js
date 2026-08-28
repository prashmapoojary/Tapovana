const { query } = require('../src/config/db');

async function testFetchAssignments() {
  console.log("=== TESTING ASSIGNMENT FETCH FOR PRASH POO AND PRASHMA SALIAN ===");

  const targetEmails = ['29prashma10@gmail.com', 'prashmapoojary@gmail.com', 'prashma2910@gmail.com'];

  for (const email of targetEmails) {
    const uRes = await query(`
      SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name AS role 
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE tm.email = $1
    `, [email]);

    if (!uRes.rows.length) {
      console.log(`\nEmail ${email} not found.`);
      continue;
    }

    const user = uRes.rows[0];
    console.log(`\n======================================================`);
    console.log(`STAFF: ${user.first_name} ${user.last_name} (${user.role}) | Email: ${user.email} | ID: ${user.id}`);

    // Trigger auto-sync allocations logic
    const { getMyAssignments } = require('../src/controllers/servicesController');
    const req = { user, query: {} };
    const res = {
      json: (data) => {
        console.log(`Success: ${data.success} | Total Assignments: ${data.assignments ? data.assignments.length : 0}`);
        if (data.assignments && data.assignments.length) {
          console.table(data.assignments.map(a => ({
            id: a.displayRecordId,
            type: a.type,
            title: a.sessionTitle,
            startDate: a.startDate ? String(a.startDate).slice(0, 10) : null,
            time: a.bookingTime,
            status: a.status
          })));
        }
      },
      status: (code) => ({ json: (data) => console.log(`HTTP ${code}:`, data) })
    };

    await getMyAssignments(req, res);
  }

  process.exit(0);
}

testFetchAssignments();
