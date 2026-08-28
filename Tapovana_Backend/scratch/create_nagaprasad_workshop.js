const { query } = require('../src/config/db');
const { sendWorkshopAllocationNotificationEmail } = require('../src/services/emailService');

async function createNagaprasadWorkshop() {
  console.log("🌟 --- CREATING WORKSHOP FOR NAGAPRASAD SALIAN --- 🌟\n");

  const targetEmail = "nagaprasadsalian22@gmail.com";

  // 1. Update email for Nagaprasad Salian in DB
  console.log(`1️⃣ Updating email for Nagaprasad Salian to "${targetEmail}"...`);
  await query(`
    UPDATE team_members 
    SET email = $1 
    WHERE id = '5185ecb8-47b0-45ff-a37f-09de4f0e549d' OR LOWER(first_name) = 'nagaprasad'
  `, [targetEmail]);
  console.log("   ✅ Nagaprasad's email updated!\n");

  // Fetch Nagaprasad's details
  const nagaRes = await query("SELECT tm.id, tm.first_name, tm.last_name, tm.email, r.name as role FROM team_members tm JOIN roles r ON tm.role_id = r.id WHERE LOWER(tm.email) = $1", [targetEmail]);
  const nagaprasad = nagaRes.rows[0];
  const staffId = nagaprasad.id;
  const staffName = `${nagaprasad.first_name} ${nagaprasad.last_name}`;

  console.log(`2️⃣ Creating dedicated Workshop assigned to ${staffName} (${nagaprasad.email})...`);

  const workshopTitle = "Advanced Vedic Energy Healing & Chakra Restoration";
  const category = "Yoga & Meditation";
  const description = "Exclusive 2-hour practical workshop on advanced prana manipulation, aura cleansing, and chakra alignment techniques.";
  const date = "2026-09-20";
  const time = "10:00 AM - 12:00 PM";
  const price = 2500;
  const capacity = 30;
  const imageUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80";
  const videoUrl = "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80";
  const staffIdsJson = JSON.stringify([staffId]);

  // Insert Workshop
  const wsRes = await query(`
    INSERT INTO workshops 
    (title, category, description, date, time, price, capacity, enrolled, image_url, video_url, instructor, instructor_id, status, assigned_staff_ids)
    VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, $11, 'Upcoming', $12) RETURNING id, title
  `, [
    workshopTitle, category, description, date, time,
    price, capacity, imageUrl, videoUrl, staffName, staffId, staffIdsJson
  ]);

  const workshop = wsRes.rows[0];
  console.log(`   ✨ Created Workshop: "${workshop.title}" [ID: ${workshop.id}]`);

  // Insert Allocation into 'allocations' table for My Assignments page
  const allocId = `ws-alloc-${workshop.id}-${staffId}`;
  await query(`
    INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, duration_minutes, status)
    VALUES ($1, $2, 'workshop', $3, $4, $5, $5, 120, 'active')
    ON CONFLICT (id) DO UPDATE SET
      staff_id = EXCLUDED.staff_id,
      session_title = EXCLUDED.session_title,
      status = EXCLUDED.status
  `, [allocId, staffId, workshopTitle, String(workshop.id), date]);

  console.log(`   ✨ Allocation created in 'allocations' table [ID: ${allocId}]!`);

  // Update staff status to busy / allocated
  await query("UPDATE team_members SET availability_status = 'allocated' WHERE id = $1", [staffId]);

  // Send allocation notification email directly to nagaprasadsalian22@gmail.com
  try {
    await sendWorkshopAllocationNotificationEmail({
      to: nagaprasad.email,
      staffName: staffName,
      workshopTitle: workshopTitle,
      date: date,
      time: time
    });
    console.log(`   📧 Allocation email successfully sent to Nagaprasad (${nagaprasad.email})!`);
  } catch (emailErr) {
    console.error("   ⚠️ Email error:", emailErr.message);
  }

  // 3. Verify allocation appears in My Assignments query
  console.log("\n3️⃣ Verifying assignment in 'allocations' query for Nagaprasad...");
  const allocCheck = await query(`
    SELECT a.id as alloc_id, a.staff_id, a.type, a.session_title, a.start_date, a.status,
           w.title, w.date, w.time, w.status as ws_status
    FROM allocations a
    LEFT JOIN workshops w ON w.id::text = a.session_id
    WHERE a.staff_id = $1 AND a.type = 'workshop'
  `, [staffId]);

  console.log(`📌 Found ${allocCheck.rows.length} assigned workshops for Nagaprasad Salian:`);
  console.table(allocCheck.rows);

  console.log("\n==========================================");
  console.log("🎉 WORKSHOP CREATED & ASSIGNED TO NAGAPRASAD SUCCESSFULLY!");
  console.log("==========================================\n");

  process.exit(0);
}

createNagaprasadWorkshop().catch(err => {
  console.error("❌ Error creating workshop:", err);
  process.exit(1);
});
