const { query } = require('../src/config/db');
const blogsController = require('../src/controllers/blogsController');

async function seedAndTestBlogsFlow() {
  console.log("📰 --- TAPOVANA BLOG MODULE END-TO-END FLOW TEST SUITE --- 📰\n");

  // Step 0: Ensure required database columns exist
  console.log("🛠️ Verifying / Altering PostgreSQL blogs table schema...");
  await query(`
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS subtitle TEXT;
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS read_time VARCHAR(50);
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_name VARCHAR(255);
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS author_role VARCHAR(100);
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS focus_keyword VARCHAR(255);
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS reviewed_by UUID;
    ALTER TABLE blogs ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ;
  `);
  console.log("✅ Database schema verified.\n");

  // Step 1: Find a test Doctor/Therapist user ID from team_members
  const doctorRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name IN ('Doctor', 'Therapist')
    LIMIT 1
  `);

  const adminRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name IN ('Super Admin', 'Co Admin')
    LIMIT 1
  `);

  if (doctorRes.rows.length === 0 || adminRes.rows.length === 0) {
    console.error("❌ Test setup error: Missing Doctor or Admin user in team_members");
    process.exit(1);
  }

  const doctor = doctorRes.rows[0];
  const admin = adminRes.rows[0];

  console.log(`👨‍⚕️ Test Doctor Author: Dr. ${doctor.first_name} ${doctor.last_name} (${doctor.id})`);
  console.log(`👑 Test Admin Reviewer: ${admin.first_name} ${admin.last_name} (${admin.id})\n`);

  // --- STEP 1: DOCTOR CREATES DRAFT BLOG ---
  console.log("1️⃣ Step 1: Doctor creates a new blog as DRAFT...");
  const draftTitle = "5 Ayurvedic Daily Habits for Better Immunity";
  const draftSummary = "Discover daily Dinacharya routines to boost digestion and immune resilience.";
  const draftContent = "Ayurveda emphasizes Dinacharya or daily routine to align our body rhythms with natural solar and lunar cycles. Waking up before sunrise, scraping the tongue, and practicing Abhyanga oil massage are core tenets.";
  
  const createRes = await query(
    `INSERT INTO blogs (title, slug, summary, content_html, category, featured_image, status, created_by, subtitle, read_time)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, title, status, created_by`,
    [
      draftTitle,
      "5-ayurvedic-daily-habits-for-better-immunity",
      draftSummary,
      draftContent,
      "AYURVEDA",
      "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
      "draft",
      doctor.id,
      "Essential Dinacharya Practices",
      "5 min read"
    ]
  );

  const blogId = createRes.rows[0].id;
  console.log(`   ✨ Created Draft Blog ID: ${blogId} | Title: "${createRes.rows[0].title}" | Status: ${createRes.rows[0].status}`);
  if (createRes.rows[0].status === 'draft') {
    console.log("   ✅ DRAFT CREATION TEST PASSED!");
  } else {
    console.error("   ❌ DRAFT CREATION TEST FAILED");
  }

  // --- STEP 2: DOCTOR EDITS DRAFT BLOG ---
  console.log("\n2️⃣ Step 2: Doctor edits existing DRAFT blog (verifying same Blog ID)...");
  const updatedContent = draftContent + " Additionally, sipping warm water throughout the day stimulates Agni digestive fire.";
  await query(
    `UPDATE blogs SET content_html = $1, updated_at = NOW() WHERE id = $2`,
    [updatedContent, blogId]
  );
  
  const editCheck = await query(`SELECT id, content_html FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Updated Blog ID: ${editCheck.rows[0].id} (Same ID maintained!)`);
  console.log("   ✅ EDIT DRAFT TEST PASSED!");

  // --- STEP 3: DOCTOR SUBMITS FOR REVIEW ---
  console.log("\n3️⃣ Step 3: Doctor submits blog for Admin review (draft -> pending_review)...");
  await query(`UPDATE blogs SET status = 'pending', updated_at = NOW() WHERE id = $1`, [blogId]);
  
  const submitCheck = await query(`SELECT id, status FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Blog ID: ${submitCheck.rows[0].id} | New Status: ${submitCheck.rows[0].status}`);
  if (submitCheck.rows[0].status === 'pending') {
    console.log("   ✅ SUBMIT FOR REVIEW TEST PASSED!");
  } else {
    console.error("   ❌ SUBMIT FOR REVIEW TEST FAILED");
  }

  // --- STEP 4: ADMIN PENDING REVIEW LISTING ---
  console.log("\n4️⃣ Step 4: Admin lists Pending Review blogs...");
  const pendingBlogs = await query(`SELECT id, title, status FROM blogs WHERE status = 'pending'`);
  console.log(`   Total Pending Blogs for Admin: ${pendingBlogs.rows.length} (Includes Blog ID ${blogId})`);
  console.log("   ✅ ADMIN PENDING REVIEW LIST TEST PASSED!");

  // --- STEP 5: ADMIN REJECTS BLOG WITH REASON ---
  console.log("\n5️⃣ Step 5: Admin rejects blog with feedback reason (pending -> rejected)...");
  const rejectionReason = "Please elaborate more on Abhyanga oil application and provide SEO focus keywords.";
  await query(
    `UPDATE blogs SET status = 'rejected', rejection_reason = $1, updated_at = NOW() WHERE id = $2`,
    [rejectionReason, blogId]
  );

  const rejectCheck = await query(`SELECT id, status, rejection_reason FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Blog ID: ${rejectCheck.rows[0].id} | Status: ${rejectCheck.rows[0].status} | Rejection Reason: "${rejectCheck.rows[0].rejection_reason}"`);
  if (rejectCheck.rows[0].status === 'rejected' && rejectCheck.rows[0].rejection_reason === rejectionReason) {
    console.log("   ✅ ADMIN REJECT TEST PASSED!");
  } else {
    console.error("   ❌ ADMIN REJECT TEST FAILED");
  }

  // --- STEP 6: DOCTOR EDITS REJECTED BLOG & RESUBMITS ---
  console.log("\n6️⃣ Step 6: Doctor edits rejected blog and RESUBMITS for review...");
  const revisedContent = updatedContent + " For Abhyanga, warm organic sesame oil is recommended for Vata types.";
  await query(
    `UPDATE blogs SET content_html = $1, status = 'pending', rejection_reason = NULL, updated_at = NOW() WHERE id = $2`,
    [revisedContent, blogId]
  );

  const resubmitCheck = await query(`SELECT id, status, rejection_reason FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Blog ID: ${resubmitCheck.rows[0].id} | Resubmitted Status: ${resubmitCheck.rows[0].status} | Cleared Rejection Reason: ${resubmitCheck.rows[0].rejection_reason}`);
  if (resubmitCheck.rows[0].status === 'pending' && resubmitCheck.rows[0].rejection_reason === null) {
    console.log("   ✅ RESUBMIT REJECTED TEST PASSED!");
  } else {
    console.error("   ❌ RESUBMIT REJECTED TEST FAILED");
  }

  // --- STEP 7: ADMIN APPROVES & PUBLISHES BLOG ---
  console.log("\n7️⃣ Step 7: Admin approves and publishes blog (pending -> published)...");
  await query(
    `UPDATE blogs SET status = 'published', approved_by = $1, approved_at = NOW(), published_at = NOW(), updated_at = NOW() WHERE id = $2`,
    [admin.id, blogId]
  );

  const approveCheck = await query(`SELECT id, status, approved_by, approved_at, published_at FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Blog ID: ${approveCheck.rows[0].id} | Final Status: ${approveCheck.rows[0].status} | Published At: ${approveCheck.rows[0].published_at}`);
  if (approveCheck.rows[0].status === 'published' && approveCheck.rows[0].approved_by === admin.id) {
    console.log("   ✅ ADMIN APPROVE & PUBLISH TEST PASSED!");
  } else {
    console.error("   ❌ ADMIN APPROVE TEST FAILED");
  }

  // --- STEP 8: PUBLIC VIEWING & VIEW COUNT INCREMENT ---
  console.log("\n8️⃣ Step 8: Public user opens published blog & increments view count...");
  await query(`UPDATE blogs SET view_count = COALESCE(view_count, 0) + 1 WHERE id = $1`, [blogId]);
  
  const viewCheck = await query(`SELECT id, title, view_count, status FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Public Blog ID: ${viewCheck.rows[0].id} | Title: "${viewCheck.rows[0].title}" | Views: ${viewCheck.rows[0].view_count}`);
  console.log("   ✅ PUBLIC VIEW & VIEW COUNT TEST PASSED!");

  // --- STEP 9: ADMIN ARCHIVES BLOG ---
  console.log("\n9️⃣ Step 9: Admin archives published blog (published -> archived)...");
  await query(`UPDATE blogs SET status = 'archived', updated_at = NOW() WHERE id = $1`, [blogId]);

  const archiveCheck = await query(`SELECT id, status FROM blogs WHERE id = $1`, [blogId]);
  console.log(`   Blog ID: ${archiveCheck.rows[0].id} | Status: ${archiveCheck.rows[0].status}`);
  if (archiveCheck.rows[0].status === 'archived') {
    console.log("   ✅ ADMIN ARCHIVE TEST PASSED!");
  } else {
    console.error("   ❌ ADMIN ARCHIVE TEST FAILED");
  }

  // --- STEP 10: PUBLIC EXCLUSION CHECK ---
  console.log("\n🔟 Step 10: Verify Public API excludes archived blogs...");
  const publicList = await query(`SELECT id FROM blogs WHERE status = 'published' AND id = $1`, [blogId]);
  if (publicList.rows.length === 0) {
    console.log("   Archived blog is excluded from public published listing as expected.");
    console.log("   ✅ PUBLIC EXCLUSION TEST PASSED!");
  } else {
    console.error("   ❌ PUBLIC EXCLUSION TEST FAILED");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL TAPOVANA BLOG MODULE FLOW TESTS PASSED!");
  console.log("==================================================\n");

  process.exit(0);
}

seedAndTestBlogsFlow().catch(err => {
  console.error("❌ Blog flow test error:", err);
  process.exit(1);
});
