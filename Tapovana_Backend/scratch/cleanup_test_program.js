const { query } = require('../src/config/db');

async function cleanup() {
  await query(`DELETE FROM allocations WHERE session_id = '66' AND type = 'vedic_program'`);
  await query(`DELETE FROM vedic_programs WHERE id = 66`);
  console.log("Cleaned up test Vedic Program 66 successfully.");
  process.exit(0);
}

cleanup();
