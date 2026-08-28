const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
});

async function allocate() {
  try {
    const nagaprasadRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) = 'saliannagaprasad22@gmail.com'");
    const prashmaTherapistRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) = '29prashma10@gmail.com'");
    const adminRes = await pool.query("SELECT * FROM team_members WHERE LOWER(email) = 'prashmapoojary@gmail.com'");

    const naga = nagaprasadRes.rows[0];
    const prash = prashmaTherapistRes.rows[0];
    const admin = adminRes.rows[0];

    console.log("Nagaprasad ID:", naga.id, naga.first_name, naga.last_name, naga.email);
    console.log("Prashma Therapist ID:", prash.id, prash.first_name, prash.last_name, prash.email);
    console.log("Admin ID:", admin.id, admin.first_name, admin.last_name, admin.email);

    const wsList = await pool.query("SELECT id, title, date, time, duration FROM workshops ORDER BY date ASC, time ASC");
    const workshops = wsList.rows;
    console.log(`Found ${workshops.length} workshops.`);

    // 4 for Nagaprasad, 2 for Prashma Therapist, 1 for Admin
    const mapping = [
      { ws: workshops[0], staff: naga, count: 'Naga 1/4' },
      { ws: workshops[1], staff: naga, count: 'Naga 2/4' },
      { ws: workshops[2], staff: naga, count: 'Naga 3/4' },
      { ws: workshops[3], staff: naga, count: 'Naga 4/4' },
      { ws: workshops[4], staff: prash, count: 'Prash 1/2' },
      { ws: workshops[5], staff: prash, count: 'Prash 2/2' },
      { ws: workshops[6], staff: admin, count: 'Admin 1/1' },
    ];

    for (const m of mapping) {
      if (!m.ws) continue;
      const staffName = `${m.staff.first_name} ${m.staff.last_name}`.trim();
      const staffIdsJson = JSON.stringify([m.staff.id]);

      await pool.query(`
        UPDATE workshops
        SET instructor = $1,
            instructor_id = $2,
            assigned_staff_ids = $3::jsonb,
            allocation_count = 1,
            updated_at = NOW()
        WHERE id = $4
      `, [staffName, m.staff.id, staffIdsJson, m.ws.id]);

      const allocId = `ws-alloc-${m.ws.id}-${m.staff.id}`;
      let dateVal = new Date().toISOString().split('T')[0];
      if (m.ws.date) {
        dateVal = m.ws.date instanceof Date ? m.ws.date.toISOString().split('T')[0] : String(m.ws.date).split('T')[0];
      }

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
        [allocId, m.staff.id, m.ws.title, String(m.ws.id), dateVal, dateVal, m.ws.time || '10:00 AM', m.ws.duration || 60]
      );

      console.log(`✅ Allocated Workshop "${m.ws.title}" to ${staffName} (${m.staff.email}) [${m.count}]`);
    }

    // Update staff status
    for (const s of [naga, prash, admin]) {
      await pool.query("UPDATE team_members SET availability_status = 'Allocated' WHERE id = $1", [s.id]);
    }

    // Verify allocations table count per staff
    const resCount = await pool.query(`
      SELECT tm.first_name || ' ' || tm.last_name as name, tm.email, COUNT(a.id) as alloc_count
      FROM allocations a
      JOIN team_members tm ON tm.id = a.staff_id
      GROUP BY tm.first_name, tm.last_name, tm.email
    `);
    console.log("\n--- FINAL DB ALLOCATION COUNTS ---");
    console.table(resCount.rows);

  } catch (err) {
    console.error("Allocation Error:", err);
  } finally {
    await pool.end();
  }
}

allocate();
