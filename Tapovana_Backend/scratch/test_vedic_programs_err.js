const { query } = require('../src/config/db');
const { getAllVedicPrograms } = require('../src/controllers/vedicProgramsController');

async function testVedicPrograms() {
  console.log("=== TESTING GET ALL VEDIC PROGRAMS ===");

  const req = { query: {} };
  const res = {
    status: (code) => {
      console.log("STATUS CODE:", code);
      return res;
    },
    json: (data) => {
      console.log("JSON RESPONSE SUCCESS:", data.success, "COUNT:", data.programs?.length || 0);
      if (data.message) console.log("MESSAGE:", data.message);
    }
  };

  try {
    await getAllVedicPrograms(req, res);
  } catch (e) {
    console.error("CATCH ERROR:", e);
  }

  process.exit(0);
}

testVedicPrograms();
