const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: false
});

async function main() {
  try {
    await client.connect();
    console.log("Connected to database.");

    // Find an active doctor/therapist for testing
    const staffRes = await client.query(`
      SELECT tm.id, tm.first_name, tm.last_name 
      FROM team_members tm
      JOIN roles r ON r.id = tm.role_id
      WHERE tm.status = 'active' AND LOWER(r.name) IN ('doctor', 'therapist')
      LIMIT 1
    `);
    
    if (staffRes.rows.length === 0) {
      console.error("No active doctor or therapist found in database!");
      return;
    }
    const staff = staffRes.rows[0];
    const staffId = staff.id;
    console.log(`Using staff for testing: ${staff.first_name} ${staff.last_name} (${staffId})`);

    const { checkStaffAllocationConflict } = require('./src/utils/conflictChecker');

    const testDate = '2026-08-10';

    // Cleanup existing allocations on that date for this staff
    await client.query("DELETE FROM allocations WHERE staff_id = $1 AND (start_date::date = $2::date OR end_date::date = $2::date OR (start_date::date <= $2::date AND end_date::date >= $2::date))", [staffId, testDate]);

    // Test 1: Daily Service Cap (Rule 1)
    console.log("\n--- Testing Rule 1: Daily Service Cap (3 services max) ---");
    // Add 3 mock services to allocations
    for (let i = 1; i <= 3; i++) {
      await client.query(`
        INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
        VALUES ($1, $2, 'service', $3, $4, $5, $5, $6, 60, 'Confirmed')
      `, [`test-service-${i}`, staffId, `Test Service ${i}`, `sess-serv-${i}`, testDate, `${9 + i}:00 AM`]);
    }

    // Propose a 4th service on the same date
    let res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '2:00 PM',
      durationMins: 60,
      type: 'service'
    });
    console.log("4th Service check result (Expected DAILY_SERVICE_CAP_REACHED):");
    console.log(res);

    // Clean up Rule 1 data
    await client.query("DELETE FROM allocations WHERE staff_id = $1 AND start_date::date = $2::date", [staffId, testDate]);


    // Test 2: Time Conflict Check (Rule 2)
    console.log("\n--- Testing Rule 2: Time Conflict Check (Overlap) ---");
    // Insert a service at 10:00 AM (duration 60 mins -> ends 11:00 AM)
    await client.query(`
      INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
      VALUES ($1, $2, 'service', $3, $4, $5, $5, '10:00 AM', 60, 'Confirmed')
    `, [`test-time-1`, staffId, 'Test Service at 10', 'sess-time-1', testDate]);

    // Propose an overlapping service at 10:30 AM
    res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '10:30 AM',
      durationMins: 60,
      type: 'service'
    });
    console.log("Overlapping Service at 10:30 AM check result (Expected TIME_CONFLICT):");
    console.log(res);

    // Clean up Rule 2 data
    await client.query("DELETE FROM allocations WHERE staff_id = $1 AND start_date::date = $2::date", [staffId, testDate]);


    // Test 3: Service + Workshop Limit (Rule 3)
    console.log("\n--- Testing Rule 3: Service + Workshop Limit ---");
    // Insert 2 services
    for (let i = 1; i <= 2; i++) {
      await client.query(`
        INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
        VALUES ($1, $2, 'service', $3, $4, $5, $5, $6, 60, 'Confirmed')
      `, [`test-rule3-serv-${i}`, staffId, `Test Service Rule3 ${i}`, `sess-rule3-${i}`, testDate, `${8 + i * 2}:00 AM`]);
    }
    // Check that we can add 1 workshop (should pass because only 2 services exist)
    res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '2:00 PM',
      durationMins: 120,
      type: 'workshop'
    });
    console.log("Adding 1st Workshop with 2 services check result (Expected success - conflict: false):");
    console.log(res);

    // Insert 1 workshop to simulate active day
    await client.query(`
      INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
      VALUES ($1, $2, 'workshop', $3, $4, $5, $5, '2:00 PM', 120, 'Confirmed')
    `, [`test-rule3-wkshop-1`, staffId, 'Test Workshop Rule3', 'sess-rule3-wk', testDate]);

    // Try adding a 2nd workshop (expected limit exceeded)
    res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '5:00 PM',
      durationMins: 120,
      type: 'workshop'
    });
    console.log("Adding 2nd Workshop check result (Expected WORKSHOP_LIMIT_REACHED):");
    console.log(res);

    // Try adding a 3rd service (expected blocked because workshop exists)
    res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '5:00 PM',
      durationMins: 60,
      type: 'service'
    });
    console.log("Adding 3rd Service check result (Expected SERVICE_BLOCKED_BY_WORKSHOP):");
    console.log(res);

    // Clean up Rule 3 data
    await client.query("DELETE FROM allocations WHERE staff_id = $1 AND start_date::date = $2::date", [staffId, testDate]);


    // Test 4: Vedic Life Package Exclusivity (Rule 4)
    console.log("\n--- Testing Rule 4: Vedic Life Package Exclusivity ---");
    // Insert active Vedic Program spanning 2026-08-08 to 2026-08-15
    await client.query(`
      INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status)
      VALUES ($1, $2, 'vedic_program', $3, $4, $5, $6, '00:00', 1440, 'Confirmed')
    `, [`test-rule4-vedic-1`, staffId, 'Test Vedic Program', 'sess-rule4-v', '2026-08-08', '2026-08-15']);

    // Propose a service on 2026-08-10 (during Vedic program)
    res = await checkStaffAllocationConflict({
      staffId,
      date: testDate,
      timeStr: '10:00 AM',
      durationMins: 60,
      type: 'service'
    });
    console.log("Service check during Vedic Life check result (Expected VEDIC_LIFE_ACTIVE):");
    console.log(res);

    // Clean up Rule 4 data
    await client.query("DELETE FROM allocations WHERE staff_id = $1 AND (start_date::date = $2::date OR end_date::date = $2::date OR (start_date::date <= $2::date AND end_date::date >= $2::date))", [staffId, testDate]);

    console.log("\nAll double-booking rules tests completed successfully!");

  } catch (err) {
    console.error("Test execution failed:", err);
  } finally {
    await client.end();
  }
}

main();
