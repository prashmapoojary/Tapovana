const { getValidCustomerMembership } = require('../src/utils/membershipHelper');
const { query } = require('../src/config/db');

async function testMatchingRule() {
  console.log("🌟 --- TESTING COMPULSORY NAME + EMAIL (ID AS 3RD OPTION) MEMBERSHIP MATCHING --- 🌟\n");

  // 1. Fetch an active membership record from DB
  const memRes = await query(`SELECT id, name, email, tier FROM memberships WHERE status = 'active' LIMIT 1`);
  if (memRes.rows.length === 0) {
    throw new Error("No active membership found in DB to test!");
  }
  const mem = memRes.rows[0];
  console.log(`📌 Sample Active Membership: Name="${mem.name}", Email="${mem.email}", Tier=${mem.tier}, ID=${mem.id}`);

  // Test Case 1: Exact Name + Email match (Compulsory Rule) -> MUST SUCCEED
  console.log("\n1️⃣ Test Case 1: Exact Name + Email match");
  const res1 = await getValidCustomerMembership(mem.email, mem.name);
  console.log(`   Result active=${res1.active}, tier=${res1.tier}, discountRate=${res1.discountRate}`);
  if (!res1.active) throw new Error("Test Case 1 Failed: Exact Name + Email match should be active!");
  console.log("   ✅ Test Case 1 PASSED!");

  // Test Case 2: Matching Email with WRONG Name -> MUST FAIL (Compulsory Name+Email rule)
  console.log("\n2️⃣ Test Case 2: Matching Email with WRONG Name");
  const res2 = await getValidCustomerMembership(mem.email, "Wrong Person Name");
  console.log(`   Result active=${res2.active}, tier=${res2.tier}`);
  if (res2.active) throw new Error("Test Case 2 Failed: Matching Email with WRONG Name should NOT be active!");
  console.log("   ✅ Test Case 2 PASSED!");

  // Test Case 3: Matching Name with WRONG Email -> MUST FAIL (Compulsory Name+Email rule)
  console.log("\n3️⃣ Test Case 3: Matching Name with WRONG Email");
  const res3 = await getValidCustomerMembership("wrong.email@example.com", mem.name);
  console.log(`   Result active=${res3.active}, tier=${res3.tier}`);
  if (res3.active) throw new Error("Test Case 3 Failed: Matching Name with WRONG Email should NOT be active!");
  console.log("   ✅ Test Case 3 PASSED!");

  // Test Case 4: ID provided as 3rd option fallback -> MUST SUCCEED
  console.log("\n4️⃣ Test Case 4: ID provided as 3rd option fallback");
  const res4 = await getValidCustomerMembership(null, null, new Date(), mem.id);
  console.log(`   Result active=${res4.active}, tier=${res4.tier}`);
  if (!res4.active) throw new Error("Test Case 4 Failed: ID match as 3rd option should be active!");
  console.log("   ✅ Test Case 4 PASSED!");

  console.log("\n==================================================");
  console.log("🎉 ALL MEMBERSHIP MATCHING RULE TESTS PASSED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

testMatchingRule().catch(err => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
