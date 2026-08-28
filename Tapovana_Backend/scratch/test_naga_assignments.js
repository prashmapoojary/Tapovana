const { getMyAssignments } = require('../src/controllers/servicesController');

async function testNaga() {
  const req = {
    query: { staff_id: 'saliannagaprasad22@gmail.com' },
    user: null
  };

  const res = {
    status: (code) => {
      console.log('RES STATUS:', code);
      return res;
    },
    json: (data) => {
      console.log('RES JSON Success:', data.success);
      console.log('Staff Info:', data.staff);
      console.log('Assignments Count:', data.assignments ? data.assignments.length : 0);
      if (data.assignments) {
        console.table(data.assignments.map(a => ({ title: a.sessionTitle, date: a.startDate, time: a.bookingTime })));
      }
      return res;
    }
  };

  try {
    console.log("Testing getMyAssignments for Nagaprasad Salian...");
    await getMyAssignments(req, res);
  } catch (err) {
    console.error("Test Error:", err);
  }
}

testNaga();
