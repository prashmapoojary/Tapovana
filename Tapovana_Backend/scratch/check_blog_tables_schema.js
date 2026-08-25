const { query } = require('../src/config/db');

async function checkBlogTables() {
  try {
    const tables = ['blogs', 'blog_likes', 'blog_bookmarks', 'blog_comments', 'blog_views', 'blog_audit_log', 'blog_tags', 'blog_versions'];
    for (const t of tables) {
      try {
        const cols = await query(`
          SELECT column_name, data_type 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [t]);
        console.log(`\n--- TABLE: ${t} ---`);
        console.log(cols.rows);
      } catch (err) {
        console.error(`Failed to inspect table ${t}:`, err.message);
      }
    }
    process.exit(0);
  } catch (err) {
    console.error("Script failed:", err);
    process.exit(1);
  }
}

checkBlogTables();
