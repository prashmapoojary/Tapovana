const { query } = require('../src/config/db');

async function seedRoles() {
  const rolesToInsert = [
    { name: 'Super Admin', label: 'Super Admin', access: JSON.stringify(["ALL"]) },
    { name: 'Co Admin', label: 'Co Admin', access: JSON.stringify(["ADMIN"]) },
    { name: 'Doctor', label: 'Doctor', access: JSON.stringify(["STAFF"]) },
    { name: 'Therapist', label: 'Therapist', access: JSON.stringify(["STAFF"]) },
    { name: 'Consultant', label: 'Consultant', access: JSON.stringify(["STAFF"]) }
  ];

  for (const r of rolesToInsert) {
    const check = await query(
      "SELECT id FROM roles WHERE UPPER(REPLACE(REPLACE(name, ' ', '_'), '-', '_')) = UPPER(REPLACE(REPLACE($1, ' ', '_'), '-', '_')) OR UPPER(REPLACE(REPLACE(label, ' ', '_'), '-', '_')) = UPPER(REPLACE(REPLACE($1, ' ', '_'), '-', '_'))",
      [r.name]
    );
    if (!check.rows.length) {
      await query(
        "INSERT INTO roles (name, label, access) VALUES ($1, $2, $3)",
        [r.name, r.label, r.access]
      );
      console.log(`✅ Seeded role: ${r.name}`);
    } else {
      console.log(`ℹ️ Role already exists: ${r.name} (ID: ${check.rows[0].id})`);
    }
  }

  const allRoles = await query("SELECT id, name, label FROM roles");
  console.log("\nFINAL ROLES IN DB:", allRoles.rows);
  process.exit(0);
}

seedRoles().catch(err => {
  console.error("❌ Error seeding roles:", err);
  process.exit(1);
});
