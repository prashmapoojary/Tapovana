const { checkStaffAllocationConflict } = require('../src/utils/conflictChecker');

async function testConflict() {
  // Nagaprasad ID: d68913bf-144b-42c7-88d5-3e12c177bf1e
  const res = await checkStaffAllocationConflict({
    staffId: 'd68913bf-144b-42c7-88d5-3e12c177bf1e',
    date: '2026-09-16',
    timeStr: '14:59',
    durationMins: 60,
    type: 'vedic_program',
    sessionId: 'test-session'
  });

  console.log("Conflict Check Result:");
  console.log("Conflict:", res.conflict);
  console.log("Message:", res.message);
}

testConflict();
