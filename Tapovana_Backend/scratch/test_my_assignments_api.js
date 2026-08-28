const { Pool } = require('pg');
require('dotenv').config();

const { getMyAssignments } = require('../src/controllers/servicesController');

async function testApi() {
  const req = {
    query: { staff_id: 'prashmapoojary@gmail.com' },
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
      console.log('Assignments:', data.assignments);
      return res;
    }
  };

  try {
    console.log("Testing getMyAssignments by email...");
    await getMyAssignments(req, res);
  } catch (err) {
    console.error("Test Error:", err);
  }
}

testApi();
