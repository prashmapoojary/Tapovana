const { query } = require('../src/config/db');
const { createWorkshop } = require('../src/controllers/workshopController');

async function testCreateWorkshop() {
  console.log("=== TESTING CREATE WORKSHOP CONTROLLER ===");

  const tmRes = await query(`SELECT tm.id, tm.first_name, tm.last_name FROM team_members tm JOIN roles r ON r.id = tm.role_id WHERE UPPER(r.name) IN ('DOCTOR', 'THERAPIST') LIMIT 1`);
  if (!tmRes.rows.length) {
    console.log("No staff found");
    process.exit(0);
  }
  const staffId = tmRes.rows[0].id;
  const staffName = `${tmRes.rows[0].first_name} ${tmRes.rows[0].last_name}`;

  const req = {
    body: {
      title: "Test Workshop Creation 2026",
      category: "Yoga",
      instructor: staffName,
      date: "2026-09-15",
      time: "10:00 AM",
      duration: 60,
      capacity: 50,
      price: 500,
      assigned_staff_ids: [staffId],
      description: "Test description for workshop"
    },
    user: { id: staffId }
  };

  const res = {
    status: (code) => {
      console.log("RESPONSE CODE:", code);
      return res;
    },
    json: (data) => {
      console.log("RESPONSE JSON:", JSON.stringify(data, null, 2));
    }
  };

  try {
    await createWorkshop(req, res);
  } catch (e) {
    console.error("CATCH ERROR:", e);
  }

  process.exit(0);
}

testCreateWorkshop();
