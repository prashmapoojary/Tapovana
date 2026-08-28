const { query } = require('../src/config/db');

async function seedAssignments() {
  console.log("=== SEEDING RICH ASSIGNMENTS FOR PRASH POO AND PRASHMA SALIAN ===");

  const prashPooIds = ['4a089107-5e16-470c-a744-389bbe82bef2', '4dd67d95-ff18-4393-91e5-16af20e71fd2'];
  const prashmaSalianId = 'e3b7e479-11b0-47b1-b583-e918120ec75b';

  try {
    // 1. Assign Vedic Programs ID 40 and 41 to Prashma Salian as lead consultant
    await query(`
      UPDATE vedic_programs 
      SET lead_consultant_id = $1::uuid, consultant_id = $1::uuid, updated_at = NOW() 
      WHERE id IN (40, 41, 43)
    `, [prashmaSalianId]);
    console.log("Assigned Vedic Programs 40, 41, 43 to Prashma Salian.");

    // 2. Assign Vedic Programs ID 42 and 44 to Prash Poo
    await query(`
      UPDATE vedic_programs 
      SET lead_consultant_id = $1::uuid, consultant_id = $1::uuid, updated_at = NOW() 
      WHERE id IN (42, 44)
    `, [prashPooIds[0]]);
    await query(`
      UPDATE vedic_programs 
      SET lead_consultant_id = $1::uuid, consultant_id = $1::uuid, updated_at = NOW() 
      WHERE id IN (42, 44)
    `, [prashPooIds[1]]);
    console.log("Assigned Vedic Programs 42, 44 to Prash Poo.");

    // 3. Ensure Workshops are assigned to both
    const workshopsRes = await query(`SELECT id, title FROM workshops LIMIT 4`);
    if (workshopsRes.rows.length >= 2) {
      await query(`
        UPDATE workshops 
        SET instructor_id = $1::uuid, instructor = 'Prashma Salian' 
        WHERE id = $2
      `, [prashmaSalianId, workshopsRes.rows[0].id]);

      await query(`
        UPDATE workshops 
        SET instructor_id = $1::uuid, instructor = 'prash poo' 
        WHERE id = $2
      `, [prashPooIds[0], workshopsRes.rows[1].id]);

      if (workshopsRes.rows[2]) {
        await query(`
          UPDATE workshops 
          SET instructor_id = $1::uuid, instructor = 'prash poo' 
          WHERE id = $2
        `, [prashPooIds[1], workshopsRes.rows[2].id]);
      }
      console.log("Assigned Workshops to Prashma Salian and Prash Poo.");
    }

    // 4. Create fresh active bookings for Prashma Salian
    const checkBk1 = await query(`SELECT id FROM bookings WHERE service_name = 'Deep Tissue Abhyanga Therapy' AND therapist_id = $1 LIMIT 1`, [prashmaSalianId]);
    if (!checkBk1.rows.length) {
      await query(`
        INSERT INTO bookings (service_name, user_name, user_email, booking_date, booking_time, therapist_id, therapist_name, status, created_at)
        VALUES ('Deep Tissue Abhyanga Therapy', 'Karthik Rao', 'karthik.rao@gmail.com', '2026-08-30', '11:00 AM', $1::uuid, 'Dr. Prashma Salian', 'CONFIRMED', NOW())
      `, [prashmaSalianId]);
    }

    const checkBk2 = await query(`SELECT id FROM bookings WHERE service_name = 'Herbal Shirodhara Healing' AND therapist_id = $1 LIMIT 1`, [prashmaSalianId]);
    if (!checkBk2.rows.length) {
      await query(`
        INSERT INTO bookings (service_name, user_name, user_email, booking_date, booking_time, therapist_id, therapist_name, status, created_at)
        VALUES ('Herbal Shirodhara Healing', 'Ananya Hegde', 'ananya.hegde@gmail.com', '2026-09-02', '02:00 PM', $1::uuid, 'Dr. Prashma Salian', 'CONFIRMED', NOW())
      `, [prashmaSalianId]);
    }

    // 5. Create fresh active bookings for Prash Poo
    for (const pId of prashPooIds) {
      const checkBkP = await query(`SELECT id FROM bookings WHERE service_name = 'Kesar & Chandan Glow Facial' AND therapist_id = $1 LIMIT 1`, [pId]);
      if (!checkBkP.rows.length) {
        await query(`
          INSERT INTO bookings (service_name, user_name, user_email, booking_date, booking_time, therapist_id, therapist_name, status, created_at)
          VALUES ('Kesar & Chandan Glow Facial', 'Pooja Shetty', 'pooja.shetty@gmail.com', '2026-08-31', '10:00 AM', $1::uuid, 'prash poo', 'CONFIRMED', NOW())
        `, [pId]);
      }
    }

    console.log("Fresh Bookings created successfully.");

  } catch (e) {
    console.error("Error seeding assignments:", e);
  }

  process.exit(0);
}

seedAssignments();
