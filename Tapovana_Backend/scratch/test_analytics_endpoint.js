const { query } = require('../src/config/db');
const { getAnalyticsDashboard } = require('../src/controllers/homeController');

async function testAnalytics() {
  console.log("=== TESTING ANALYTICS DASHBOARD RESPONSE ===");
  const req = { query: { date_filter: "today" } };
  const res = {
    json: (data) => {
      console.log("SUCCESS:", data.success);
      console.log("\n--- SERVICE DEMAND SERVICES ---");
      console.table(data.service_demand_services);
      console.log("\n--- SERVICE DEMAND WORKSHOPS ---");
      console.table(data.service_demand_workshops);
      console.log("\n--- SERVICE DEMAND VEDIC ---");
      console.table(data.service_demand_vedic);
    },
    status: (code) => ({ json: (data) => console.log(`STATUS ${code}:`, data) })
  };

  await getAnalyticsDashboard(req, res);
  process.exit(0);
}

testAnalytics();
