const { query } = require('../src/config/db');

async function testLikes() {
  try {
    console.log("Testing likes & bookmarks query...");
    const userId = '8bf0519d-c367-44b3-8b80-80a90d9c4dd8';
    const blogIds = [4, 5, 6, 7, 8, 9];

    console.log("1. Querying blog_likes...");
    const likesRes = await query('SELECT blog_id FROM blog_likes WHERE user_id = $1 AND blog_id = ANY($2)', [userId, blogIds]);
    console.log("Likes Result:", likesRes.rows);

    console.log("2. Querying blog_bookmarks...");
    const bookmarksRes = await query('SELECT blog_id FROM blog_bookmarks WHERE user_id = $1 AND blog_id = ANY($2)', [userId, blogIds]);
    console.log("Bookmarks Result:", bookmarksRes.rows);

    process.exit(0);
  } catch (err) {
    console.error("EXACT ERROR CAPTURED:", err);
    process.exit(1);
  }
}

testLikes();
