const { query } = require('../src/config/db');

async function debugBlogs() {
  try {
    console.log("--- DEBUGGING BLOGS DB & API ---");

    // 1. Inspect existing statuses in blogs table
    const statuses = await query('SELECT DISTINCT status FROM blogs');
    console.log("Current statuses in DB:", statuses.rows.map(r => r.status));

    // 2. Fetch sample user (Therapist & Admin)
    const therapist = await query(`
      SELECT tm.id, tm.email, r.name AS role 
      FROM team_members tm 
      JOIN roles r ON r.id = tm.role_id 
      WHERE UPPER(r.name) IN ('DOCTOR', 'THERAPIST') LIMIT 1
    `);
    console.log("Sample Therapist:", therapist.rows[0]);

    const admin = await query(`
      SELECT tm.id, tm.email, r.name AS role 
      FROM team_members tm 
      JOIN roles r ON r.id = tm.role_id 
      WHERE UPPER(r.name) IN ('SUPER_ADMIN', 'CO_ADMIN') LIMIT 1
    `);
    console.log("Sample Admin:", admin.rows[0]);

    // 3. Test queries for different status parameters
    const user = therapist.rows[0] || { id: '00000000-0000-0000-0000-000000000000', email: 'test@example.com' };
    const testStatuses = ['my_blogs', 'draft', 'pending', 'pending_review', 'published', 'rejected', 'archived', 'other_blogs', ''];

    for (const st of testStatuses) {
      try {
        console.log(`\nTesting status parameter: "${st}"`);
        let where = [];
        let params = [];
        let paramIdx = 1;

        if (st === 'my_blogs') {
          where.push(`(b.created_by = $${paramIdx} OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER($${paramIdx + 1})))`);
          params.push(user.id, user.email);
          paramIdx += 2;
        } else if (st === 'draft' || st === 'rejected') {
          where.push(`(b.created_by = $${paramIdx} OR (tm.email IS NOT NULL AND LOWER(tm.email) = LOWER($${paramIdx + 1}))) AND b.status = $${paramIdx + 2}`);
          params.push(user.id, user.email, st === 'pending_review' ? 'pending' : st);
          paramIdx += 3;
        } else if (st === 'pending' || st === 'pending_review') {
          where.push(`b.status IN ('pending', 'pending_review')`);
        } else if (st === 'published' || st === 'archived') {
          where.push(`b.status = $${paramIdx++}`);
          params.push(st);
        } else if (st === 'other_blogs') {
          where.push(`(b.created_by != $${paramIdx} AND (tm.email IS NULL OR LOWER(tm.email) != LOWER($${paramIdx + 1}))) AND b.status = 'published'`);
          params.push(user.id, user.email);
          paramIdx += 2;
        }

        const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
        const sql = `
          SELECT b.*, 
                 tm.first_name AS author_first_name, tm.last_name AS author_last_name, 
                 tm.email AS author_email, r.name AS author_role
          FROM blogs b
          LEFT JOIN team_members tm ON tm.id = b.created_by
          LEFT JOIN roles r ON r.id = tm.role_id
          ${whereClause}
          ORDER BY b.created_at DESC
        `;
        console.log("SQL:", sql);
        console.log("Params:", params);
        const res = await query(sql, params);
        console.log(`Success! Returned ${res.rows.length} rows.`);
      } catch (qErr) {
        console.error(`Error testing status "${st}":`, qErr);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error("Debug script failed:", err);
    process.exit(1);
  }
}

debugBlogs();
