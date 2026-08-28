const { query } = require('../src/config/db');

// Mock email service
const emailService = require('../src/services/emailService');
emailService.sendWorkshopAllocationNotificationEmail = async () => true;

const workshopController = require('../src/controllers/workshopController');

async function verifyWorkshopDbAndMobileFetch() {
  console.log("🌟 --- STARTING WORKSHOP DATABASE & MOBILE APP FETCH VERIFICATION --- 🌟\n");

  // 1. Fetch Doctor or Therapist
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  if (staffRes.rows.length === 0) throw new Error("No Doctor/Therapist found");
  const staff = staffRes.rows[0];

  // 2. Create Workshop with Unsplash Image & Video URL
  console.log("1️⃣ Step 1: Creating Workshop with Unsplash Media in Database...");
  const unsplashImg = "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=800&q=80";
  const unsplashVid = "https://images.unsplash.com/photo-1506126613408-eca07ce68773";

  const createReq = {
    user: { id: staff.id },
    body: {
      title: "Unsplash Yoga & Meditation Wellness Immersion",
      category: "Yoga",
      instructor: `${staff.first_name} ${staff.last_name}`,
      instructor_id: staff.id,
      assigned_staff_ids: [staff.id],
      date: "2026-12-15",
      time: "09:00 AM",
      duration: 90,
      capacity: 100,
      price: 3500,
      description: "Comprehensive Unsplash media workshop stored directly in PostgreSQL.",
      image_url: unsplashImg,
      video_url: unsplashVid
    }
  };

  const createRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await workshopController.createWorkshop(createReq, createRes);
  if (!createRes.data || !createRes.data.success) {
    throw new Error(`Failed to create workshop: ${createRes.data?.message}`);
  }

  const createdWs = createRes.data.workshop;
  console.log(`   ✅ Created Workshop ID: ${createdWs.id} | Image: ${createdWs.image_url}`);

  // 3. Step 2: Fetch workshops via GET /api/workshops (Mobile App Endpoint)
  console.log("\n2️⃣ Step 2: Fetching Workshops via GET /api/workshops Mobile API...");
  const getReq = { query: {} };
  const getRes = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await workshopController.getAllWorkshops(getReq, getRes);
  if (!getRes.data || !getRes.data.success) {
    throw new Error(`Failed to fetch workshops: ${getRes.data?.message}`);
  }

  const fetchedList = getRes.data.workshops || [];
  console.log(`   Total Workshops Returned for Mobile App: ${fetchedList.length}`);
  const match = fetchedList.find(w => String(w.id) === String(createdWs.id));

  if (!match) {
    throw new Error("Created workshop was not returned by mobile API GET /api/workshops!");
  }
  console.log(`   📌 Mobile App Fetched Workshop: "${match.title}" | Image: ${match.image_url} | Price: ₹${match.price}`);

  // 4. Step 3: Clean up
  console.log("\n3️⃣ Step 3: Cleaning up test record...");
  await query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(createdWs.id)]);
  await query("DELETE FROM workshops WHERE id = $1", [createdWs.id]);
  console.log("   ✅ Cleaned up test workshop.");

  console.log("\n==================================================");
  console.log("🎉 WORKSHOP UNSPLASH MEDIA & MOBILE FETCH VERIFIED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

verifyWorkshopDbAndMobileFetch().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
