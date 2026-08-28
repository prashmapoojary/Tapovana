const { query } = require('../src/config/db');

async function verifyAdminBlogTabs() {
  console.log("=== VERIFYING BLOGS FOR ADMIN TABS ===");

  try {
    const pubRes = await query(`SELECT id, title, status, category, author_name FROM blogs WHERE status = 'published'`);
    console.log(`\nPublished Blogs Count: ${pubRes.rows.length}`);
    console.table(pubRes.rows);

    const pendRes = await query(`SELECT id, title, status, category, author_name FROM blogs WHERE status IN ('pending', 'pending_review')`);
    console.log(`\nPending Review Blogs Count: ${pendRes.rows.length}`);
    console.table(pendRes.rows);

  } catch (e) {
    console.error("Verification error:", e);
  }

  process.exit(0);
}

verifyAdminBlogTabs();
