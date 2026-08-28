const { query } = require('../src/config/db');

async function checkPrashmaMembership() {
  console.log("=== CHECKING MEMBERSHIPS TABLE FOR PRASHMA POOJARY ===");

  try {
    const memRes = await query(`
      SELECT * FROM memberships
      WHERE LOWER(email) LIKE '%prashma%'
         OR LOWER(name) LIKE '%prashma%'
    `);

    console.log(`Found ${memRes.rows.length} membership records:`);
    console.table(memRes.rows);

    // Also check all membership tiers
    const allMems = await query(`SELECT id, name, email, tier, status FROM memberships LIMIT 20`);
    console.log("\nAll memberships in DB:");
    console.table(allMems.rows);

  } catch (e) {
    console.error("Query error:", e);
  }

  process.exit(0);
}

checkPrashmaMembership();
