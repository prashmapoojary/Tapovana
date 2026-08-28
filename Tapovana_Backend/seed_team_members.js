/**
 * seed_team_members.js
 * Directly seeds Doctors, Therapists, and Co-Admin team members with temporary passwords.
 */

const { Pool } = require("pg");
const bcrypt = require("bcryptjs");
const { v4: uuidv4 } = require("uuid");
const { sendWelcomeEmail } = require("./src/services/emailService");
require("dotenv").config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const membersToCreate = [
  // Doctors (3)
  {
    first_name: "Prashma",
    last_name: "Poojary",
    email: "prashma2910@gmail.com",
    role: "DOCTOR",
    specialization: "Ayurvedic Physician & Panchakarma Specialist",
    phone: "9876543210"
  },
  {
    first_name: "Nagaprasad",
    last_name: "Salian",
    email: "saliannagaprasad22@gmail.com",
    role: "DOCTOR",
    specialization: "Vedic Life & Kayachikitsa Specialist",
    phone: "9876543211"
  },
  {
    first_name: "Ananya",
    last_name: "Rao",
    email: "dr.ananya.tapovana@gmail.com",
    role: "DOCTOR",
    specialization: "Nadi Pariksha & Wellness Specialist",
    phone: "9876543212"
  },

  // Therapists (3)
  {
    first_name: "Prashma",
    last_name: "Therapist",
    email: "29prashma10@gmail.com",
    role: "THERAPIST",
    specialization: "Abhyanga & Swedana Therapy",
    phone: "9876543213"
  },
  {
    first_name: "Sushma",
    last_name: "Poojari",
    email: "sushpoojari.28@gmail.com",
    role: "THERAPIST",
    specialization: "Shirodhara & Marma Therapy",
    phone: "9876543214"
  },
  {
    first_name: "Kavya",
    last_name: "Shetty",
    email: "therapist.kavya.tapovana@gmail.com",
    role: "THERAPIST",
    specialization: "Deep Tissue & Herbal Spa Therapy",
    phone: "9876543215"
  },

  // Co-Admin (1)
  {
    first_name: "Rose",
    last_name: "Prashma",
    email: "prashmap@rosettesmartlife.com",
    role: "CO_ADMIN",
    specialization: "Operations & Co-Administrator",
    phone: "9876543216"
  }
];

function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789@#$";
  let pass = "";
  for (let i = 0; i < 10; i++) {
    pass += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pass;
}

async function seedTeamMembers() {
  console.log("🌱 Seeding Team Members into database...\n");

  const client = await pool.connect();
  const createdList = [];

  try {
    for (const m of membersToCreate) {
      await client.query("BEGIN");

      // 1. Get role_id
      const targetRoleNorm = m.role.toUpperCase().trim().replace(/[\s-]+/g, "_");
      const roleRes = await client.query(
        `SELECT id FROM roles WHERE UPPER(REPLACE(REPLACE(name, ' ', '_'), '-', '_')) = $1 OR UPPER(REPLACE(REPLACE(label, ' ', '_'), '-', '_')) = $1 LIMIT 1`,
        [targetRoleNorm]
      );

      if (!roleRes.rows.length) {
        console.error(`❌ Role ${m.role} not found in roles table!`);
        await client.query("ROLLBACK");
        continue;
      }
      const roleId = roleRes.rows[0].id;

      // 2. Check if user already exists
      const existing = await client.query(
        "SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)",
        [m.email]
      );

      let memberId;
      if (existing.rows.length) {
        memberId = existing.rows[0].id;
        await client.query(
          `UPDATE team_members 
           SET first_name = $1, last_name = $2, phone = $3, role_id = $4, specialization = $5, status = 'active', updated_at = NOW()
           WHERE id = $6`,
          [m.first_name, m.last_name, m.phone, roleId, m.specialization, memberId]
        );
        console.log(`   🔄 Updated existing team member: ${m.first_name} ${m.last_name} (${m.email})`);
      } else {
        const newMember = await client.query(
          `INSERT INTO team_members (
            first_name, last_name, email, phone, role_id, specialization,
            status, profile_photo_source, profile_photo_url, avatar_url
           )
           VALUES ($1, $2, $3, $4, $5, $6, 'active', 'local', 'avatar1.svg', 'avatar1.svg')
           RETURNING id`,
          [m.first_name, m.last_name, m.email, m.phone, roleId, m.specialization]
        );
        memberId = newMember.rows[0].id;
        console.log(`   ✅ Created new team member: ${m.first_name} ${m.last_name} (${m.email})`);
      }

      // 3. Generate Temp Password & Login Credentials
      const tempPassword = generateTempPassword();
      const tempHash = await bcrypt.hash(tempPassword, 12);
      const resetToken = uuidv4().replace(/-/g, "");
      const tokenExpiry = new Date(Date.now() + 48 * 3600000);

      const credExisting = await client.query(
        "SELECT id FROM login_credentials WHERE member_id = $1",
        [memberId]
      );

      if (credExisting.rows.length) {
        await client.query(
          `UPDATE login_credentials
           SET temp_password_hash = $1, reset_token = $2, reset_token_expiry = $3, must_change = TRUE, updated_at = NOW()
           WHERE member_id = $4`,
          [tempHash, resetToken, tokenExpiry, memberId]
        );
      } else {
        await client.query(
          `INSERT INTO login_credentials (member_id, temp_password_hash, reset_token, reset_token_expiry, must_change)
           VALUES ($1, $2, $3, $4, TRUE)`,
          [memberId, tempHash, resetToken, tokenExpiry]
        );
      }

      await client.query("COMMIT");

      // 4. Send Welcome Email
      const frontendUrl = process.env.FRONTEND_URL || "https://tapovana-admin.onrender.com";
      const resetUrl = `${frontendUrl}/set-password?token=${resetToken}`;
      sendWelcomeEmail({ to: m.email, firstName: m.first_name, tempPassword, resetUrl }).catch(err => {
        console.warn(`   ⚠️ Could not send email to ${m.email}:`, err.message);
      });

      createdList.push({
        name: `${m.first_name} ${m.last_name}`,
        email: m.email,
        role: m.role,
        tempPassword
      });
    }

    console.log("\n🎉 ALL TEAM MEMBERS SEEDED SUCCESSFULLY!\n");
    console.table(createdList);

  } catch (err) {
    console.error("❌ Error seeding team members:", err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedTeamMembers();
