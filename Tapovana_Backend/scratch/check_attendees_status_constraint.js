const { query } = require('../src/config/db');

async function checkConstraint() {
  try {
    const res = await query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'attendees' AND c.conname = 'attendees_status_check'
    `);
    console.log("attendees_status_check definition:");
    console.log(res.rows[0]?.constraint_def);

    const resVedic = await query(`
      SELECT pg_get_constraintdef(c.oid) AS constraint_def
      FROM pg_constraint c
      JOIN pg_class t ON c.conrelid = t.oid
      WHERE t.relname = 'vedic_attendees' AND c.conname LIKE '%status%'
    `);
    console.log("vedic_attendees status constraint:");
    console.log(resVedic.rows);

    process.exit(0);
  } catch (err) {
    console.error("Error checking constraints:", err);
    process.exit(1);
  }
}

checkConstraint();
