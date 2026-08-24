const { getAllWorkshops } = require('../src/controllers/workshopController');
const { getAllMemberships, getMembershipTiers } = require('../src/controllers/membershipController');

async function debug500() {
  console.log('=== DEBUGGING 500 ERRORS ===\n');

  const createMockReqRes = () => {
    let statusCode = 200;
    return {
      req: { query: {}, params: {}, headers: {} },
      res: {
        status: (code) => { statusCode = code; return { json: (d) => console.log(`Response [${code}]:`, d) }; },
        json: (d) => console.log(`Response [${statusCode}]:`, d)
      }
    };
  };

  console.log('1. Calling getAllWorkshops...');
  try {
    const w = createMockReqRes();
    await getAllWorkshops(w.req, w.res);
  } catch (err) {
    console.error('getAllWorkshops Error Stack:', err);
  }

  console.log('\n2. Calling getAllMemberships...');
  try {
    const m = createMockReqRes();
    await getAllMemberships(m.req, m.res);
  } catch (err) {
    console.error('getAllMemberships Error Stack:', err);
  }

  console.log('\n3. Calling getMembershipTiers...');
  try {
    const t = createMockReqRes();
    await getMembershipTiers(t.req, t.res);
  } catch (err) {
    console.error('getMembershipTiers Error Stack:', err);
  }

  process.exit(0);
}

debug500();
