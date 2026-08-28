const { query } = require('../src/config/db');

async function debugCreate() {
  try {
    const { createVedicProgram } = require('../src/controllers/vedicProgramsController');
    
    // Fetch lead consultant ID
    const docRes = await query("SELECT id FROM team_members WHERE status = 'active' LIMIT 1");
    const leadId = docRes.rows[0].id;

    const req = {
      body: {
        title: "Test Diagnostic Package 1",
        type: "Retreat",
        description: "Testing package creation.",
        duration: "7-days",
        startDate: "2026-09-01",
        endDate: "2026-09-07",
        capacity: 15,
        price: 5000,
        accommodations: "Standard",
        consultant_id: leadId,
        assigned_staff_ids: []
      }
    };

    const res = {
      status: (code) => {
        console.log("RES CODE:", code);
        return res;
      },
      json: (data) => {
        console.log("RES JSON:", data);
        return res;
      }
    };

    console.log("Calling createVedicProgram...");
    await createVedicProgram(req, res);
    console.log("Done calling createVedicProgram.");
  } catch (err) {
    console.error("FATAL ERROR IN TEST:", err);
  }
}

debugCreate();
