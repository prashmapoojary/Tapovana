const { query } = require('../src/config/db');
const { getMyAssignments } = require('../src/controllers/servicesController');

async function testPrashAssignments() {
  console.log("=== TESTING GET MY ASSIGNMENTS FOR PRASH POO ===");

  const prashId = '4dd67d95-ff18-4393-91e5-16af20e71fd2';
  const req = {
    query: { staff_id: prashId },
    user: { id: prashId, email: 'prashmapoojary@gmail.com', name: 'prash poo' }
  };

  let outputData = null;
  const res = {
    status: (code) => {
      console.log("Response Status:", code);
      return res;
    },
    json: (data) => {
      outputData = data;
    }
  };

  try {
    await getMyAssignments(req, res);
    console.log("Success:", outputData.success);
    console.log("Total Assignments Found:", outputData.assignments?.length || 0);
    if (outputData.assignments?.length > 0) {
      console.table(outputData.assignments.map(a => ({
        id: a.id,
        type: a.type,
        title: a.sessionTitle,
        date: a.startDate,
        time: a.bookingTime,
        customer: a.customerName,
        status: a.status
      })));
    }
  } catch (e) {
    console.error("Error:", e);
  }

  process.exit(0);
}

testPrashAssignments();
