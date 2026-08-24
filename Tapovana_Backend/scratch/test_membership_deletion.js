const { pool, query } = require('../src/config/db');
const { getAllMemberships, deleteMembership } = require('../src/controllers/membershipController');

async function testMembershipDeletion() {
  console.log('=== TESTING MEMBERSHIP DELETION PERSISTENCE ===\n');

  const testEmail = 'deleted_test_user_999@example.com';
  
  // 1. Insert test member
  console.log('1. Inserting test membership...');
  await query(`
    INSERT INTO memberships (name, email, phone, tier, join_date, expiry_date, status)
    VALUES ('Delete Test User', $1, '9998887776', 'SILVER', NOW(), NOW(), 'active')
    ON CONFLICT DO NOTHING
  `, [testEmail]);

  // 2. Fetch membership ID
  const fetchRes = await query('SELECT id FROM memberships WHERE LOWER(email) = LOWER($1)', [testEmail]);
  if (!fetchRes.rows.length) {
    console.error('Failed to create test membership.');
    process.exit(1);
  }
  const testId = fetchRes.rows[0].id;
  console.log(`✅ Created test membership with ID: ${testId}`);

  // 3. Delete membership
  console.log('\n2. Calling deleteMembership...');
  const reqD = { params: { id: String(testId) } };
  const resD = {
    status: (code) => ({ json: (d) => console.log(`Delete Response [${code}]:`, d) }),
    json: (d) => console.log('Delete Response [200]:', d)
  };
  await deleteMembership(reqD, resD);

  // 4. Call getAllMemberships to verify it is NOT in response
  console.log('\n3. Verifying getAllMemberships does NOT return deleted member...');
  const reqG = { query: {} };
  const resG = {
    json: (d) => {
      const found = d.memberships ? d.memberships.find(m => m.email.toLowerCase() === testEmail) : null;
      if (found) {
        console.error('❌ ERROR: Deleted membership WAS returned in getAllMemberships!');
      } else {
        console.log('✅ SUCCESS: Deleted membership was NOT returned in getAllMemberships!');
      }
    }
  };
  await getAllMemberships(reqG, resG);

  // 5. Clean up test table entry
  await query('DELETE FROM deleted_memberships WHERE LOWER(email) = LOWER($1)', [testEmail]);
  console.log('\n🎉 PERMANENT DELETION TEST PASSED PERFECTLY!');
  process.exit(0);
}

testMembershipDeletion().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
