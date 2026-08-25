const { query } = require('../src/config/db');

const extraAttendees = [
  { name: "Rohan Poojary", email: "rohanpoojary.88@gmail.com", phone: "9845123456" },
  { name: "Ananya Rao", email: "ananyarao.vedic@gmail.com", phone: "9741234567" }
];

async function addExtraAttendees() {
  try {
    console.log("1. Ensuring extra attendees exist in customers table...");
    for (const att of extraAttendees) {
      const parts = att.name.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      const existing = await query("SELECT id FROM customers WHERE LOWER(email) = LOWER($1)", [att.email]);
      if (existing.rows.length === 0) {
        await query(`
          INSERT INTO customers (name, first_name, last_name, email, phone, status)
          VALUES ($1, $2, $3, $4, $5, 'Active')
        `, [att.name, firstName, lastName, att.email, att.phone]);
        console.log(`✓ Added Customer: ${att.name}`);
      } else {
        await query(`
          UPDATE customers SET name = $1, phone = $2 WHERE id = $3
        `, [att.name, att.phone, existing.rows[0].id]);
        console.log(`✓ Updated Customer: ${att.name}`);
      }
    }

    console.log("\n2. Fetching first 4 workshops from database...");
    const workshopsRes = await query("SELECT id, title, date, time FROM workshops ORDER BY created_at DESC LIMIT 4");
    
    if (workshopsRes.rows.length === 0) {
      console.error("❌ No workshops found in database!");
      process.exit(1);
    }

    console.log(`Found ${workshopsRes.rows.length} workshops to add attendees to:`);
    for (const w of workshopsRes.rows) {
      console.log(`  - Workshop ID ${w.id}: "${w.title}" (${w.date} [${w.time}])`);

      for (const att of extraAttendees) {
        // Check if attendee is already registered
        const existingAtt = await query(
          "SELECT id FROM attendees WHERE workshop_id = $1 AND LOWER(email) = LOWER($2)",
          [w.id, att.email]
        );

        if (existingAtt.rows.length === 0) {
          await query(`
            INSERT INTO attendees (
              workshop_id, name, email, phone, status, certificate_eligible, created_at, updated_at
            ) VALUES (
              $1, $2, $3, $4, 'enrolled', true, NOW(), NOW()
            )
          `, [w.id, att.name, att.email, att.phone]);
          console.log(`    ✓ Enrolled ${att.name} (${att.email}) into Workshop "${w.title}"`);
        } else {
          console.log(`    ℹ ${att.name} already enrolled in Workshop "${w.title}"`);
        }
      }

      // Update enrolled count for this workshop
      const countRes = await query("SELECT COUNT(*) FROM attendees WHERE workshop_id = $1", [w.id]);
      const currentEnrolled = parseInt(countRes.rows[0].count, 10);
      await query("UPDATE workshops SET enrolled = $1 WHERE id = $2", [currentEnrolled, w.id]);
      console.log(`    ➡ Updated Workshop enrolled count to ${currentEnrolled}`);
    }

    console.log("\n🎉 EXTRA ATTENDEES SUCCESSFULLY ADDED TO WORKSHOPS!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error adding extra attendees:", err);
    process.exit(1);
  }
}

addExtraAttendees();
