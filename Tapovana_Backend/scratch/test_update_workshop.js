const { query } = require('../src/config/db');
const workshopController = require('../src/controllers/workshopController');

async function testWorkshopUpdate() {
  console.log("🌟 --- TESTING WORKSHOP UPDATE API (PATCH /api/workshops/:id) --- 🌟\n");

  // 1. Fetch active Doctor or Therapist for staff allocation
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  if (!staffRes.rows.length) throw new Error("No active Doctor/Therapist found");
  const staff = staffRes.rows[0];

  // 2. Create test Workshop
  const wsRes = await query(
    `INSERT INTO workshops (title, category, instructor, instructor_id, assigned_staff_ids, date, time, duration, capacity, price, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
    ['Test Update Workshop', 'Ayurveda', `${staff.first_name} ${staff.last_name}`, staff.id, JSON.stringify([staff.id]), '2026-12-30', '10:00 AM', 60, 50, 2000, 'Upcoming']
  );
  const workshop = wsRes.rows[0];
  console.log(`📌 Created Workshop ID: ${workshop.id} | Assigned Staff: ${workshop.assigned_staff_ids}`);

  // 3. Test UPDATE (PATCH /api/workshops/:id)
  console.log("\n1️⃣ Updating workshop title, duration, and price...");
  const updateReq = {
    params: { id: workshop.id },
    body: {
      title: "Updated Workshop Title",
      category: "Ayurveda",
      duration: 90,
      price: 2500,
      instructor: `${staff.first_name} ${staff.last_name}`,
      instructor_id: staff.id,
      assigned_staff_ids: [staff.id]
    }
  };
  const updateRes = {
    statusCode: 200,
    data: null,
    status: function(c) { this.statusCode = c; return this; },
    json: function(d) { this.data = d; return this; }
  };

  await workshopController.updateWorkshop(updateReq, updateRes);
  if (updateRes.statusCode !== 200 || !updateRes.data || !updateRes.data.success) {
    throw new Error(`Workshop update failed with status ${updateRes.statusCode}: ${updateRes.data?.message}`);
  }

  console.log(`   ✅ Workshop update succeeded! Status Code: ${updateRes.statusCode}`);
  console.log(`   📌 Updated Record: "${updateRes.data.workshop.title}" | Duration: ${updateRes.data.workshop.duration} mins | Price: ₹${updateRes.data.workshop.price}`);

  // 4. Cleanup
  console.log("\n2️⃣ Cleaning up test records...");
  await query('DELETE FROM workshops WHERE id = $1', [workshop.id]);
  await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(workshop.id)]);
  console.log("   ✅ Cleaned up test records.");

  console.log("\n==========================================");
  console.log("🎉 WORKSHOP UPDATE VERIFIED 100% SUCCESS!");
  console.log("==========================================\n");

  process.exit(0);
}

testWorkshopUpdate().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
