const { query } = require('../src/config/db');
const bcrypt = require('bcryptjs');

async function seedTeamMembers() {
  console.log("🌱 Seeding Team Members into Database...");

  // Fetch role IDs
  const rolesRes = await query("SELECT id, name FROM roles");
  const rolesMap = {};
  rolesRes.rows.forEach(r => {
    rolesMap[r.name.toUpperCase().replace(/\s+/g, '_')] = r.id;
  });

  console.log("Roles Mapping:", rolesMap);

  const coAdminRoleId = rolesMap['CO_ADMIN'] || rolesMap['CO_ADMINISTRATOR'] || 12;
  const therapistRoleId = rolesMap['THERAPIST'] || 14;
  const doctorRoleId = rolesMap['DOCTOR'] || 13;

  const defaultPasswordHash = await bcrypt.hash("Tapovana@2026", 12);

  const teamMembersToInsert = [
    // Co Admin
    {
      first_name: "Rose",
      last_name: "Admin",
      email: "prashma@rosettesmartlife.com",
      phone: "+91 9876500001",
      role_id: coAdminRoleId,
      specialization: "Operations & Co-Administration",
      status: "active"
    },

    // Therapists (2 requested + 5 additional)
    {
      first_name: "Prashma",
      last_name: "Therapist",
      email: "29prashma10@gmail.com",
      phone: "+91 9876500002",
      role_id: therapistRoleId,
      specialization: "Abhyanga & Panchakarma Therapy",
      status: "active"
    },
    {
      first_name: "Nagaprasad",
      last_name: "Salian",
      email: "saliannagaprasad22@gmail.com",
      phone: "+91 9876500003",
      role_id: therapistRoleId,
      specialization: "Shirodhara & Herbal Oil Massages",
      status: "active"
    },
    {
      first_name: "Aanya",
      last_name: "Sharma",
      email: "aanya.therapist@tapovana.com",
      phone: "+91 9876500004",
      role_id: therapistRoleId,
      specialization: "Deep Tissue & Reflexology",
      status: "active"
    },
    {
      first_name: "Kiran",
      last_name: "Rao",
      email: "kiran.therapist@tapovana.com",
      phone: "+91 9876500005",
      role_id: therapistRoleId,
      specialization: "Ayurvedic Steam & Scrub Specialist",
      status: "active"
    },
    {
      first_name: "Meera",
      last_name: "Nair",
      email: "meera.therapist@tapovana.com",
      phone: "+91 9876500006",
      role_id: therapistRoleId,
      specialization: "Marma Therapy & Holistic Spa",
      status: "active"
    },
    {
      first_name: "Arjun",
      last_name: "Varma",
      email: "arjun.therapist@tapovana.com",
      phone: "+91 9876500007",
      role_id: therapistRoleId,
      specialization: "Kizhli Herbal Pouch Massages",
      status: "active"
    },
    {
      first_name: "Divya",
      last_name: "Patel",
      email: "divya.therapist@tapovana.com",
      phone: "+91 9876500008",
      role_id: therapistRoleId,
      specialization: "Facial Care & Skin Hydration Therapy",
      status: "active"
    },

    // Doctors (2 requested + 5 additional)
    {
      first_name: "Dr. Prashma",
      last_name: "Poojary",
      email: "prashma2910@gmail.com",
      phone: "+91 9876500009",
      role_id: doctorRoleId,
      specialization: "Chief Ayurvedic Consultant BAMS",
      status: "active"
    },
    {
      first_name: "Dr. Sushma",
      last_name: "Pujari",
      email: "sushpojari.28@gmail.com",
      phone: "+91 9876500010",
      role_id: doctorRoleId,
      specialization: "Panchakarma & Wellness Specialist MD",
      status: "active"
    },
    {
      first_name: "Dr. Anand",
      last_name: "Kumar",
      email: "dr.anand.kumar@tapovana.com",
      phone: "+91 9876500011",
      role_id: doctorRoleId,
      specialization: "Ayurvedic Internal Medicine BAMS",
      status: "active"
    },
    {
      first_name: "Dr. Priya",
      last_name: "Deshmukh",
      email: "dr.priya.deshmukh@tapovana.com",
      phone: "+91 9876500012",
      role_id: doctorRoleId,
      specialization: "Nadi Pariksha & Dietetics BAMS",
      status: "active"
    },
    {
      first_name: "Dr. Rajesh",
      last_name: "Iyer",
      email: "dr.rajesh.iyer@tapovana.com",
      phone: "+91 9876500013",
      role_id: doctorRoleId,
      specialization: "Ayurvedic Rejuvenation Specialist",
      status: "active"
    },
    {
      first_name: "Dr. Sunita",
      last_name: "Reddy",
      email: "dr.sunita.reddy@tapovana.com",
      phone: "+91 9876500014",
      role_id: doctorRoleId,
      specialization: "Women's Health & Rasayana Therapy",
      status: "active"
    },
    {
      first_name: "Dr. Vikram",
      last_name: "Singh",
      email: "dr.vikram.singh@tapovana.com",
      phone: "+91 9876500015",
      role_id: doctorRoleId,
      specialization: "Spinal Care & Kayachikitsa BAMS",
      status: "active"
    }
  ];

  let addedCount = 0;
  let updatedCount = 0;

  for (const m of teamMembersToInsert) {
    const existing = await query("SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)", [m.email]);
    let memberId = null;

    if (existing.rows.length) {
      memberId = existing.rows[0].id;
      await query(
        `UPDATE team_members
         SET first_name = $1, last_name = $2, phone = $3, role_id = $4, specialization = $5, status = $6, updated_at = NOW()
         WHERE id = $7`,
        [m.first_name, m.last_name, m.phone, m.role_id, m.specialization, m.status, memberId]
      );
      console.log(`🔄 Updated existing team member: ${m.first_name} ${m.last_name} (${m.email})`);
      updatedCount++;
    } else {
      const insertRes = await query(
        `INSERT INTO team_members (
           first_name, last_name, email, phone, role_id, specialization, status, created_at, updated_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW()) RETURNING id`,
        [m.first_name, m.last_name, m.email, m.phone, m.role_id, m.specialization, m.status]
      );
      memberId = insertRes.rows[0].id;

      // Add login credentials
      await query(
        `INSERT INTO login_credentials (member_id, temp_password_hash, must_change) VALUES ($1, $2, FALSE)
         ON CONFLICT (member_id) DO UPDATE SET temp_password_hash = $2`,
        [memberId, defaultPasswordHash]
      );

      console.log(`✅ Added new team member: ${m.first_name} ${m.last_name} (${m.email})`);
      addedCount++;
    }
  }

  console.log(`\n🎉 Completed! Added: ${addedCount}, Updated: ${updatedCount}`);
  process.exit(0);
}

seedTeamMembers().catch(err => {
  console.error("❌ Error seeding team members:", err);
  process.exit(1);
});
