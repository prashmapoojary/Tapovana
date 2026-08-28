const { query } = require('../src/config/db');

async function checkDemand() {
  console.log("=== WORKSHOPS & ATTENDEES ===");
  const ws = await query(`SELECT id, title, price, category FROM workshops;`);
  console.table(ws.rows);

  const att = await query(`SELECT id, workshop_id, name, email FROM attendees;`);
  console.log(`Total attendees count: ${att.rows.length}`);
  console.table(att.rows.slice(0, 10));

  const wsDemand = await query(`
    SELECT w.id, w.title AS name, COALESCE(MAX(w.category), 'Workshop') AS category, COUNT(a.id) AS count, COALESCE(MAX(w.price::float), 1500) AS price
    FROM workshops w
    LEFT JOIN attendees a ON (a.workshop_id::text = w.id::text)
    GROUP BY w.id, w.title
    ORDER BY count DESC;
  `);
  console.log("=== WS DEMAND QUERY ===");
  console.table(wsDemand.rows);

  console.log("\n=== VEDIC PROGRAMS & ATTENDEES ===");
  const vp = await query(`SELECT id, title, price, type FROM vedic_programs;`);
  console.table(vp.rows);

  const va = await query(`SELECT id, program_id, name, email FROM vedic_attendees;`);
  console.log(`Total vedic_attendees count: ${va.rows.length}`);
  console.table(va.rows.slice(0, 10));

  const vpDemand = await query(`
    SELECT vp.id, vp.title AS name, COALESCE(MAX(vp.type), 'Vedic Package') AS category, COUNT(va.id) AS count, COALESCE(MAX(vp.price::float), 5000) AS price
    FROM vedic_programs vp
    LEFT JOIN vedic_attendees va ON (va.program_id::text = vp.id::text)
    GROUP BY vp.id, vp.title
    ORDER BY count DESC;
  `);
  console.log("=== VP DEMAND QUERY ===");
  console.table(vpDemand.rows);

  process.exit(0);
}

checkDemand();
