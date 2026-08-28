const { query } = require('../src/config/db');
require('dotenv').config();

// We will mock req and res to see what updateWorkshop throws
const { updateWorkshop } = require('../src/controllers/workshopController');

async function testPatch() {
  const req = {
    params: { id: '1471f51b-d9a6-4c1b-8e30-0a3663369737' },
    body: {
      title: "Test Title",
      category: "Yoga",
      instructor: "Dr. Test",
      instructor_id: null,
      date: "2026-09-01",
      time: "10:00 AM",
      duration: 60,
      capacity: 10000,
      price: 1500,
      description: "Test description",
      image_url: null,
      video_url: null,
      assigned_staff_ids: []
    }
  };

  const res = {
    status: (code) => {
      console.log('RES STATUS:', code);
      return res;
    },
    json: (data) => {
      console.log('RES JSON:', data);
      return res;
    }
  };

  try {
    console.log('Running updateWorkshop...');
    await updateWorkshop(req, res);
  } catch (err) {
    console.error('CATCH ERR:', err);
  }
}

testPatch();
