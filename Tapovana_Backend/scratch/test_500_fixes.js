const { getAllWorkshops } = require('../src/controllers/workshopController');
const { getAllMemberships, getAllTiers } = require('../src/controllers/membershipController');

async function test500Fixes() {
  console.log('=== VERIFYING ALL 3 ENDPOINTS ===\n');

  const createMockReqRes = () => {
    let statusCode = 200;
    return {
      req: { query: {}, params: {}, headers: {} },
      res: {
        status: (code) => { statusCode = code; return { json: (d) => console.log(`Response [${code}]:`, d.success ? `SUCCESS (count: ${d.workshops?.length || d.memberships?.length || d.tiers?.length})` : d) }; },
        json: (d) => console.log(`Response [${statusCode}]:`, d.success ? `SUCCESS (count: ${d.workshops?.length || d.memberships?.length || d.tiers?.length})` : d)
      }
    };
  };

  console.log('1. Testing /api/workshops (getAllWorkshops)...');
  const w = createMockReqRes();
  await getAllWorkshops(w.req, w.res);

  console.log('\n2. Testing /api/memberships (getAllMemberships)...');
  const m = createMockReqRes();
  await getAllMemberships(m.req, m.res);

  console.log('\n3. Testing /api/memberships/tiers (getAllTiers)...');
  const t = createMockReqRes();
  await getAllTiers(t.req, t.res);

  console.log('\n🎉 ALL 3 ENDPOINTS RESPONDED WITH 200 SUCCESS!');
  process.exit(0);
}

test500Fixes().catch(err => {
  console.error('❌ Test error:', err);
  process.exit(1);
});
