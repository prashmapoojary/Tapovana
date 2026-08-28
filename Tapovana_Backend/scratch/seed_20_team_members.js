const { query, getClient } = require('../src/config/db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function seedTeamMembers() {
  console.log("=== SEEDING 10 DOCTORS AND 10 THERAPISTS ===");
  const client = await getClient();

  try {
    await client.query('BEGIN');

    // Get Super Admin ID for created_by
    const adminRes = await client.query(`SELECT id FROM team_members WHERE email = 'prashmapoojary@gmail.com' LIMIT 1`);
    const createdBy = adminRes.rows[0]?.id || null;

    const defaultPasswordHash = await bcrypt.hash('Tapovana@123', 10);

    const doctors = [
      {
        firstName: "Sushma",
        lastName: "Salian",
        email: "sushma@gmail.com",
        phone: "+91 9880123451",
        specialization: "BAMS, MD (Ayurveda Panchakarma Specialist)",
        avatarUrl: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Hariprasad",
        lastName: "Prabhu",
        email: "hariprasadprabhu29@gmail.com",
        phone: "+91 9880123452",
        specialization: "BAMS, Senior Ayurvedic Physician",
        avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Sushma",
        lastName: "Poojari",
        email: "sushpoojari.28@gmail.com",
        phone: "+91 9880123453",
        specialization: "BAMS, Kayachikitsa & Nadi Pariksha Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Nagaprasad",
        lastName: "Salian",
        email: "saliannagaprasad2003@gmail.com",
        phone: "+91 9880123454",
        specialization: "BAMS, Rasayana & Rejuvenation Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Ananya",
        lastName: "Shetty",
        email: "ananyashetty.dr@gmail.com",
        phone: "+91 9880123455",
        specialization: "BAMS, Shalya Tantra & Wellness Doctor",
        avatarUrl: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Vikramaditya",
        lastName: "Rao",
        email: "vikramrao.dr@gmail.com",
        phone: "+91 9880123456",
        specialization: "BAMS, Swasthavritta & Yoga Therapy",
        avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Deepa",
        lastName: "Kulkarni",
        email: "deepakulkarni.ayur@gmail.com",
        phone: "+91 9880123457",
        specialization: "BAMS, Stri Roga & Prasuti Tantra",
        avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Rajesh",
        lastName: "Bhat",
        email: "rajeshbhat.ayurveda@gmail.com",
        phone: "+91 9880123458",
        specialization: "BAMS, Agada Tantra & Detox Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1582750433449-648ed127bb54?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Meenakshi",
        lastName: "Hegde",
        email: "meenakshihegde.dr@gmail.com",
        phone: "+91 9880123459",
        specialization: "BAMS, Dravyaguna & Herbal Medicine",
        avatarUrl: "https://images.unsplash.com/photo-1594824813566-88855ce78905?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Adithya",
        lastName: "Varma",
        email: "adithyavarma.dr@gmail.com",
        phone: "+91 9880123460",
        specialization: "BAMS, Kaumarbhritya & Lifestyle Medicine",
        avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?auto=format&fit=crop&q=80&w=400"
      }
    ];

    const therapists = [
      {
        firstName: "Suhan",
        lastName: "Salian",
        email: "suhansalian.therapist@gmail.com",
        phone: "+91 9740123461",
        specialization: "Abhyanga & Panchakarma Senior Therapist",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Kavya",
        lastName: "Poojary",
        email: "kavyapoojary.wellness@gmail.com",
        phone: "+91 9740123462",
        specialization: "Shirodhara & Marma Therapy Expert",
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Prashant",
        lastName: "Kumar",
        email: "prashantkumar.therapist@gmail.com",
        phone: "+91 9740123463",
        specialization: "Kizhiss & Steam Herbal Massage Therapist",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Nisha",
        lastName: "Shetty",
        email: "nishashetty.ayurveda@gmail.com",
        phone: "+91 9740123464",
        specialization: "Udvartana & Body Sculpting Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Gautam",
        lastName: "Naik",
        email: "gautamnaik.therapy@gmail.com",
        phone: "+91 9740123465",
        specialization: "Nasya & Netra Tarpana Therapist",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Shruti",
        lastName: "Acharya",
        email: "shrutiacharya.wellness@gmail.com",
        phone: "+91 9740123466",
        specialization: "Ayurvedic Spa & Herbal Compress Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Manjunath",
        lastName: "Devadiga",
        email: "manjunathdevadiga@gmail.com",
        phone: "+91 9740123467",
        specialization: "Kati Vasti & Spine Care Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Pooja",
        lastName: "Bangera",
        email: "poojabangera.therapist@gmail.com",
        phone: "+91 9740123468",
        specialization: "Holistic Reflexology & Relaxation Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Siddharth",
        lastName: "Kulal",
        email: "siddharthkulal.ayur@gmail.com",
        phone: "+91 9740123469",
        specialization: "Pizhichil & Royal Oil Bath Therapist",
        avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=400"
      },
      {
        firstName: "Divya",
        lastName: "Mendon",
        email: "divyamendon.wellness@gmail.com",
        phone: "+91 9740123470",
        specialization: "Sound Healing & Aromatherapy Specialist",
        avatarUrl: "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=400"
      }
    ];

    let insertedCount = 0;

    // Insert Doctors (role_id: 13)
    for (const doc of doctors) {
      // Check if email already exists
      const check = await client.query('SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)', [doc.email]);
      let memberId;
      if (check.rows.length > 0) {
        memberId = check.rows[0].id;
        await client.query(
          `UPDATE team_members 
           SET first_name = $1, last_name = $2, phone = $3, specialization = $4, avatar_url = $5, role_id = 13, status = 'active', availability_status = 'Available'
           WHERE id = $6`,
          [doc.firstName, doc.lastName, doc.phone, doc.specialization, doc.avatarUrl, memberId]
        );
        console.log(`Updated Doctor: ${doc.firstName} ${doc.lastName} (${doc.email})`);
      } else {
        memberId = uuidv4();
        await client.query(
          `INSERT INTO team_members 
           (id, first_name, last_name, email, phone, role_id, specialization, avatar_url, status, availability_status, created_by)
           VALUES ($1, $2, $3, $4, $5, 13, $6, $7, 'active', 'Available', $8)`,
          [memberId, doc.firstName, doc.lastName, doc.email, doc.phone, doc.specialization, doc.avatarUrl, createdBy]
        );
        console.log(`Inserted Doctor: ${doc.firstName} ${doc.lastName} (${doc.email})`);
      }

      // Upsert login credentials
      const credCheck = await client.query('SELECT id FROM login_credentials WHERE member_id = $1', [memberId]);
      if (credCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO login_credentials (id, member_id, password_hash, must_change)
           VALUES ($1, $2, $3, false)`,
          [uuidv4(), memberId, defaultPasswordHash]
        );
      }
      insertedCount++;
    }

    // Insert Therapists (role_id: 14)
    for (const th of therapists) {
      const check = await client.query('SELECT id FROM team_members WHERE LOWER(email) = LOWER($1)', [th.email]);
      let memberId;
      if (check.rows.length > 0) {
        memberId = check.rows[0].id;
        await client.query(
          `UPDATE team_members 
           SET first_name = $1, last_name = $2, phone = $3, specialization = $4, avatar_url = $5, role_id = 14, status = 'active', availability_status = 'Available'
           WHERE id = $6`,
          [th.firstName, th.lastName, th.phone, th.specialization, th.avatarUrl, memberId]
        );
        console.log(`Updated Therapist: ${th.firstName} ${th.lastName} (${th.email})`);
      } else {
        memberId = uuidv4();
        await client.query(
          `INSERT INTO team_members 
           (id, first_name, last_name, email, phone, role_id, specialization, avatar_url, status, availability_status, created_by)
           VALUES ($1, $2, $3, $4, $5, 14, $6, $7, 'active', 'Available', $8)`,
          [memberId, th.firstName, th.lastName, th.email, th.phone, th.specialization, th.avatarUrl, createdBy]
        );
        console.log(`Inserted Therapist: ${th.firstName} ${th.lastName} (${th.email})`);
      }

      const credCheck = await client.query('SELECT id FROM login_credentials WHERE member_id = $1', [memberId]);
      if (credCheck.rows.length === 0) {
        await client.query(
          `INSERT INTO login_credentials (id, member_id, password_hash, must_change)
           VALUES ($1, $2, $3, false)`,
          [uuidv4(), memberId, defaultPasswordHash]
        );
      }
      insertedCount++;
    }

    await client.query('COMMIT');
    console.log(`\n✅ SUCCESSFULLY SEEDED ${insertedCount} TEAM MEMBERS (10 DOCTORS & 10 THERAPISTS) INTO DATABASE!`);
  } catch (err) {
    await client.query('ROLLBACK');
    console.error("Error seeding team members:", err);
  } finally {
    client.release();
    process.exit(0);
  }
}

seedTeamMembers();
