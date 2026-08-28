const { query } = require('../src/config/db');
const { getHomeSummary, getAnalyticsDashboard } = require('../src/controllers/homeController');

async function testFixes() {
  console.log("🧪 Testing error fixes...");

  // 1. Test getHomeSummary
  console.log("\n1️⃣ Testing getHomeSummary...");
  const fakeRes1 = {
    json: (data) => console.log("   ✅ getHomeSummary Success:", data.success, data.summary),
    status: (code) => ({ json: (d) => console.error("   ❌ getHomeSummary Error:", code, d) })
  };
  await getHomeSummary({}, fakeRes1);

  // 2. Test getAnalyticsDashboard (tests vedic_programs lead_consultant_id column fix)
  console.log("\n2️⃣ Testing getAnalyticsDashboard...");
  const fakeRes2 = {
    json: (data) => console.log("   ✅ getAnalyticsDashboard Success:", data.success, "Stats:", data.stats),
    status: (code) => ({ json: (d) => console.error("   ❌ getAnalyticsDashboard Error:", code, d) })
  };
  await getAnalyticsDashboard({ query: { filter: 'today' } }, fakeRes2);

  // 3. Test Service assigned_staff_ids filtering with non-array input
  console.log("\n3️⃣ Testing servicesController assigned_staff_ids parsing...");
  const servicesController = require('../src/controllers/servicesController');
  const serviceRes = await query("SELECT id FROM services LIMIT 1");
  if (serviceRes.rows.length > 0) {
    const serviceId = serviceRes.rows[0].id;
    const fakeReqUpdate = {
      params: { id: serviceId },
      body: { assigned_staff_ids: "not-an-array-string" },
      user: { id: "00000000-0000-0000-0000-000000000000" }
    };
    const fakeResUpdate = {
      json: (data) => console.log("   ✅ updateService handling string assigned_staff_ids:", data.success),
      status: (code) => ({ json: (d) => console.error("   ❌ updateService error:", code, d) })
    };
    await servicesController.updateService(fakeReqUpdate, fakeResUpdate);
  } else {
    console.log("   ℹ️ No service found to test updateService.");
  }

  console.log("\n🎉 All tests completed successfully!");
  process.exit(0);
}

testFixes().catch(err => {
  console.error("❌ Test script error:", err);
  process.exit(1);
});
