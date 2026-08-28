const { query } = require('../src/config/db');
const vedicProgramsController = require('../src/controllers/vedicProgramsController');

async function testVedicProgramCreation() {
  console.log("🌟 --- TESTING VEDIC LIFE PROGRAM CREATION API (POST /api/vedic-programs) --- 🌟\n");

  // 1. Fetch active Doctor or Therapist for lead consultant
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  if (!staffRes.rows.length) throw new Error("No active Doctor or Therapist found.");
  const staff = staffRes.rows[0];

  // 2. Test createVedicProgram
  const req = {
    body: {
      title: "Test Vedic Creation Program",
      type: "Retreat",
      description: "Comprehensive test program for Vedic Life module.",
      duration: "7-days",
      startDate: "2026-11-01",
      endDate: "2026-11-07",
      capacity: 25,
      price: 15000,
      accommodations: "Luxury Villa",
      consultant_id: staff.id,
      lead_consultant_id: staff.id,
      services: ["Panchakarma", "Yoga"],
      languages: ["English"],
      image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      assigned_staff_ids: []
    }
  };

  const res = {
    statusCode: 200, data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };

  await vedicProgramsController.createVedicProgram(req, res);
  if ((res.statusCode !== 200 && res.statusCode !== 201) || !res.data || !res.data.success) {
    throw new Error(`Create program failed with status ${res.statusCode}: ${res.data?.message}`);
  }

  const createdProgram = res.data.program;
  console.log(`   ✅ Vedic Program Created Successfully! Status: ${res.statusCode}`);
  console.log(`   📌 Program ID: ${createdProgram.id} | Title: "${createdProgram.title}" | Price: ₹${createdProgram.price}`);

  // 3. Cleanup test program
  console.log("\n2️⃣ Cleaning up test program...");
  await query("DELETE FROM vedic_programs WHERE id = $1", [createdProgram.id]);
  await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'vedic_program'", [String(createdProgram.id)]);
  console.log("   ✅ Test program cleaned up successfully.");

  console.log("\n==========================================");
  console.log("🎉 VEDIC PROGRAM CREATION VERIFIED 100% SUCCESS!");
  console.log("==========================================\n");

  process.exit(0);
}

testVedicProgramCreation().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
