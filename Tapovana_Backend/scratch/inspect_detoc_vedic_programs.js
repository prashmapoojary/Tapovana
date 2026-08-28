const { query } = require('../src/config/db');

async function inspectDetocPrograms() {
  console.log("=== INSPECTING VEDIC PROGRAMS MATCHING DETOC OR 29 AUG - 5 SEPT ===");

  try {
    const res = await query(`
      SELECT vp.id, vp.title, vp.type, vp.start_date, vp.end_date, vp.price, vp.lead_consultant_id,
             tm.first_name, tm.last_name, tm.email
      FROM vedic_programs vp
      LEFT JOIN team_members tm ON tm.id = vp.lead_consultant_id
      WHERE LOWER(vp.title) LIKE '%detoc%'
         OR (vp.start_date = '2026-08-29' AND vp.end_date = '2026-09-05')
      ORDER BY vp.id ASC
    `);

    console.log(`Found ${res.rows.length} programs:`);
    console.table(res.rows.map(r => ({
      id: r.id,
      title: r.title,
      type: r.type,
      startDate: r.start_date ? r.start_date.toISOString().split('T')[0] : null,
      endDate: r.end_date ? r.end_date.toISOString().split('T')[0] : null,
      price: r.price,
      leadConsultant: r.first_name ? `${r.first_name} ${r.last_name}` : 'Not assigned'
    })));

  } catch (e) {
    console.error("Error inspecting:", e);
  }

  process.exit(0);
}

inspectDetocPrograms();
