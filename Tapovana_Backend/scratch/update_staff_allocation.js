const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function updateAllocations() {
  try {
    // 1. Get staff details
    const prashmaRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) = '29prashma10@gmail.com'");
    const nagaprasadRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) LIKE '%nagaprasad%' OR LOWER(first_name) LIKE '%nagaprasad%'");
    const nethraRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) = 'nethrakanchan40@gmail.com'");

    const prashma = prashmaRes.rows[0];
    const nagaprasad = nagaprasadRes.rows[0];
    const nethra = nethraRes.rows[0];

    console.log("Prashma ID:", prashma.id, prashma.first_name, prashma.last_name);
    console.log("Nagaprasad ID:", nagaprasad.id, nagaprasad.first_name, nagaprasad.last_name);
    console.log("Nethra ID:", nethra.id, nethra.first_name, nethra.last_name);

    // Also ensure Nagaprasad email alias or primary email is updated if needed
    if (nagaprasad.email !== 'saliannagaprasad22@gmail.com') {
      console.log(`Updating Nagaprasad email from ${nagaprasad.email} to saliannagaprasad22@gmail.com...`);
      await pool.query("UPDATE team_members SET email = 'saliannagaprasad22@gmail.com' WHERE id = $1", [nagaprasad.id]);
    }

    // 2. Define allocation mapping (2 for Prashma, 4 for Nagaprasad, 1 for Nethra as is)
    const allocationsMapping = [
      {
        id: '1471f51b-d9a6-4c1b-8e30-0a3663369737', // Workshop 1
        staffId: prashma.id,
        staffName: `${prashma.first_name} ${prashma.last_name}`.trim(),
        label: 'Prashma 1/2'
      },
      {
        id: '38edb1cf-d363-4dd3-b194-b5f8c9953099', // Workshop 2
        staffId: prashma.id,
        staffName: `${prashma.first_name} ${prashma.last_name}`.trim(),
        label: 'Prashma 2/2'
      },
      {
        id: 'b0b12a26-b18e-4e5a-981b-6180bbd6adf8', // Workshop 3
        staffId: nagaprasad.id,
        staffName: `${nagaprasad.first_name} ${nagaprasad.last_name}`.trim(),
        label: 'Nagaprasad 1/4'
      },
      {
        id: '8ee3ec5e-3e58-4536-88cd-ff74ceeb39b4', // Workshop 4
        staffId: nagaprasad.id,
        staffName: `${nagaprasad.first_name} ${nagaprasad.last_name}`.trim(),
        label: 'Nagaprasad 2/4'
      },
      {
        id: '62de8000-8066-4ac3-83c0-0d1980773822', // Workshop 5
        staffId: nagaprasad.id,
        staffName: `${nagaprasad.first_name} ${nagaprasad.last_name}`.trim(),
        label: 'Nagaprasad 3/4'
      },
      {
        id: '990c8e72-e739-484d-ade8-032e1c4ea59d', // Workshop 6
        staffId: nagaprasad.id,
        staffName: `${nagaprasad.first_name} ${nagaprasad.last_name}`.trim(),
        label: 'Nagaprasad 4/4'
      },
      {
        id: '69edaa69-23db-4969-a6dc-5f6c096c63a3', // Workshop 7
        staffId: nethra.id,
        staffName: `${nethra.first_name} ${nethra.last_name}`.trim(),
        label: 'Nethra (As Is)'
      }
    ];

    console.log("\n--- UPDATING WORKSHOPS & ALLOCATIONS ---");
    for (const alloc of allocationsMapping) {
      const staffIdsJson = JSON.stringify([alloc.staffId]);
      await pool.query(`
        UPDATE workshops
        SET instructor = $1,
            instructor_id = $2,
            assigned_staff_ids = $3::jsonb,
            allocation_count = 1,
            updated_at = NOW()
        WHERE id = $4
      `, [alloc.staffName, alloc.staffId, staffIdsJson, alloc.id]);

      // Sync to unified allocations table
      const wsRes = await pool.query("SELECT * FROM workshops WHERE id = $1", [alloc.id]);
      if (wsRes.rows.length) {
        const ws = wsRes.rows[0];
        const allocId = `ws-alloc-${ws.id}-${alloc.staffId}`;
        let dateVal = new Date().toISOString().split('T')[0];
        if (ws.date) {
          dateVal = ws.date instanceof Date ? ws.date.toISOString().split('T')[0] : String(ws.date).split('T')[0];
        }

        // Delete old workshop allocations for this workshop first
        await pool.query("DELETE FROM allocations WHERE session_id = $1 AND type = 'workshop'", [String(ws.id)]);

        await pool.query(
          `INSERT INTO allocations (id, staff_id, type, session_title, session_id, start_date, end_date, booking_time, duration_minutes, status, created_at)
           VALUES ($1, $2, 'workshop', $3, $4, $5, $6, $7, $8, 'assigned', NOW())
           ON CONFLICT (id) DO UPDATE SET 
             staff_id = EXCLUDED.staff_id,
             session_title = EXCLUDED.session_title,
             start_date = EXCLUDED.start_date,
             end_date = EXCLUDED.end_date,
             booking_time = EXCLUDED.booking_time,
             duration_minutes = EXCLUDED.duration_minutes,
             status = 'assigned'`,
          [allocId, alloc.staffId, ws.title, String(ws.id), dateVal, dateVal, ws.time || '10:00 AM', ws.duration || 60]
        );
      }
      console.log(`✅ Updated Workshop [${alloc.id}] -> Instructor: ${alloc.staffName} (${alloc.label})`);
    }

    // 3. Update staff member availability status
    for (const staff of [prashma, nagaprasad, nethra]) {
      await pool.query("UPDATE team_members SET availability_status = 'Allocated' WHERE id = $1", [staff.id]);
    }

    console.log("\n--- FINAL WORKSHOP STAFF ALLOCATION SUMMARY ---");
    const summary = await pool.query(`
      SELECT w.id, w.title, w.instructor, w.assigned_staff_ids, tm.email as staff_email
      FROM workshops w
      LEFT JOIN team_members tm ON w.instructor_id = tm.id
      ORDER BY w.date ASC
    `);
    console.table(summary.rows);

    const counts = await pool.query(`
      SELECT tm.first_name || ' ' || tm.last_name as name, tm.email, COUNT(w.id) as allocated_workshops
      FROM workshops w
      JOIN team_members tm ON w.instructor_id = tm.id
      GROUP BY tm.first_name, tm.last_name, tm.email
    `);
    console.log("\n--- ALLOCATION COUNTS PER STAFF ---");
    console.table(counts.rows);

  } catch (err) {
    console.error("Update Error:", err);
  } finally {
    await pool.end();
  }
}

updateAllocations();
