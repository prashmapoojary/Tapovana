const { query } = require('../src/config/db');
const servicesController = require('../src/controllers/servicesController');

async function testFullServiceFlow() {
  console.log("🧪 Testing Service Full CRUD Flow...");

  const fakeReqCreate = {
    body: {
      name: "Test Wellness Massage " + Date.now(),
      category: "Body Care",
      subcategory: "Massages",
      description: "A test massage service",
      base_price: 1500,
      duration_minutes: 45,
      benefits: "Relaxation\nStress Relief",
      tools: "Oil\nTowels",
      required_certification: "Certified Massage Therapist",
      experience_level: "Intermediate",
      status: "ACTIVE"
    },
    user: { id: "00000000-0000-0000-0000-000000000000" },
    protocol: 'http',
    get: (h) => h === 'host' ? 'localhost:5000' : ''
  };

  let createdService = null;
  const fakeResCreate = {
    status: (code) => {
      console.log("   Create Status:", code);
      return { json: (d) => { console.log("   Create Response:", d); if (d.service) createdService = d.service; } };
    },
    json: (d) => { console.log("   Create Response:", d); if (d.service) createdService = d.service; }
  };

  await servicesController.createService(fakeReqCreate, fakeResCreate);

  if (!createdService || !createdService.id) {
    console.error("❌ Service creation failed.");
    process.exit(1);
  }

  const createdId = createdService.id;
  console.log(`\n✅ Service Created successfully with ID: ${createdId}`);

  // Check DB directly
  const dbCheck1 = await query("SELECT * FROM services WHERE id = $1", [createdId]);
  console.log("   DB verification after create:", dbCheck1.rows.length === 1 ? "EXISTS IN DB ✅" : "NOT FOUND ❌");

  // 2. Edit Service
  console.log(`\n2️⃣ Testing Edit Service (ID: ${createdId})...`);
  const fakeReqUpdate = {
    params: { id: createdId },
    body: {
      name: "Updated Massage Name " + Date.now(),
      base_price: 2000,
      status: "ACTIVE"
    },
    user: { id: "00000000-0000-0000-0000-000000000000" },
    protocol: 'http',
    get: (h) => h === 'host' ? 'localhost:5000' : ''
  };

  const fakeResUpdate = {
    status: (code) => {
      console.log("   Update Status:", code);
      return { json: (d) => console.log("   Update Response:", d) };
    },
    json: (d) => console.log("   Update Response:", d)
  };

  await servicesController.updateService(fakeReqUpdate, fakeResUpdate);

  // Check DB directly after update
  const dbCheck2 = await query("SELECT name, base_price FROM services WHERE id = $1", [createdId]);
  console.log("   DB verification after update:", dbCheck2.rows[0]);

  // 3. Delete Service
  console.log(`\n3️⃣ Testing Delete Service (ID: ${createdId})...`);
  const fakeReqDelete = {
    params: { id: createdId }
  };

  const fakeResDelete = {
    status: (code) => {
      console.log("   Delete Status:", code);
      return { json: (d) => console.log("   Delete Response:", d) };
    },
    json: (d) => console.log("   Delete Response:", d)
  };

  await servicesController.deleteService(fakeReqDelete, fakeResDelete);

  // Check DB directly after delete
  const dbCheck3 = await query("SELECT * FROM services WHERE id = $1", [createdId]);
  console.log("   DB verification after delete:", dbCheck3.rows.length === 0 ? "DELETED FROM DB ✅" : "STILL EXISTS ❌");

  process.exit(0);
}

testFullServiceFlow().catch(err => {
  console.error("❌ Error in test:", err);
  process.exit(1);
});
