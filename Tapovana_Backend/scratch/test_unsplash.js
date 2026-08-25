const { query } = require('../src/config/db');

async function testUnsplashTable() {
  try {
    const res = await query('SELECT * FROM unsplash_media LIMIT 10');
    console.log("Unsplash media count:", res.rows.length);
    console.log(res.rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

testUnsplashTable();
