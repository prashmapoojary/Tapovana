const { query } = require('../src/config/db');
const { sendWorkshopEnrollmentEmail } = require('../src/services/emailService');

async function seedWorkshopsAndEnrollAttendees() {
  console.log("🌟 --- SEEDING 5 NEW WORKSHOPS & ENROLLING ATTENDEES --- 🌟\n");

  // 1. Clear old workshop data
  console.log("1️⃣ Clearing old workshops, allocations, and attendees...");
  await query("DELETE FROM attendees").catch(() => {});
  await query("DELETE FROM workshop_staff").catch(() => {});
  await query("DELETE FROM allocations WHERE type = 'workshop'").catch(() => {});
  await query("DELETE FROM workshops").catch(() => {});
  console.log("   ✅ Cleared old workshop database records!\n");

  // 2. Fetch a default Doctor or Therapist for instructor assignment
  const staffRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  const instructor = staffRes.rows.length ? staffRes.rows[0] : null;
  const instructorId = instructor ? instructor.id : null;
  const instructorName = instructor ? `${instructor.first_name} ${instructor.last_name}` : "Dr. Prashma Poojary";

  // 3. Define 5 new valid workshops with Unsplash images and videos
  const workshops = [
    {
      title: "Mastering Holistic Ayurveda & Panchakarma Workshop",
      category: "Ayurveda",
      description: "Comprehensive 3-hour masterclass exploring traditional Panchakarma cleansing techniques, dosha evaluation, and customized daily wellness routines.",
      date: "2026-09-05",
      time: "10:00 AM - 01:00 PM",
      price: 1500,
      capacity: 50,
      image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      video_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      instructor: instructorName,
      instructor_id: instructorId,
      status: "Upcoming"
    },
    {
      title: "Vedic Pranayama, Breathwork & Energy Healing",
      category: "Yoga & Meditation",
      description: "Immersive practical session on ancient breathwork techniques (Anulom Vilom, Kapalabhati, Bhramari) to balance prana and reduce anxiety.",
      date: "2026-09-12",
      time: "07:00 AM - 09:30 AM",
      price: 1200,
      capacity: 40,
      image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      video_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      instructor: instructorName,
      instructor_id: instructorId,
      status: "Upcoming"
    },
    {
      title: "Ayurvedic Nutrition & Gut Immunity Masterclass",
      category: "Nutrition & Diet",
      description: "Learn how to ignite Agni (digestive fire), combine sattvic foods, and prepare therapeutic herbal teas for gut restoration and longevity.",
      date: "2026-09-18",
      time: "04:00 PM - 06:30 PM",
      price: 1800,
      capacity: 35,
      image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
      video_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
      instructor: instructorName,
      instructor_id: instructorId,
      status: "Upcoming"
    },
    {
      title: "Sound Bath, Chakra Balancing & Deep Stress Dissolution",
      category: "Mind & Meditation",
      description: "Experience Tibetan singing bowls and Vedic acoustic resonance for deep parasympathetic relaxation, sleep improvement, and mental clarity.",
      date: "2026-09-25",
      time: "06:00 PM - 08:00 PM",
      price: 2000,
      capacity: 30,
      image_url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80",
      video_url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80",
      instructor: instructorName,
      instructor_id: instructorId,
      status: "Upcoming"
    },
    {
      title: "Spiritual Hatha Yoga & Spinal Alignment Intensive",
      category: "Hatha Yoga",
      description: "Guided alignment-focused posture practice integrating classical asanas, Bandhas, and Mudras to rejuvenate the spine and vital energy channels.",
      date: "2026-10-02",
      time: "08:00 AM - 11:00 AM",
      price: 1600,
      capacity: 45,
      image_url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1200&q=80",
      video_url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1200&q=80",
      instructor: instructorName,
      instructor_id: instructorId,
      status: "Upcoming"
    }
  ];

  // 4. Attendees list requested by user
  const attendeesToEnroll = [
    { email: "29prashma10@gmail.com", name: "Prashma Poojary", phone: "7411795077" },
    { email: "prashmapoojary@gmail.com", name: "Prashma Poojary", phone: "7411795078" },
    { email: "nethrakanchan40@gmail.com", name: "Nethra Kanchan", phone: "9876543210" },
    { email: "prashma2910@gmail.com", name: "Prashma P", phone: "9876543211" }
  ];

  console.log("2️⃣ Inserting 5 new workshops and enrolling attendees...");
  const createdWorkshops = [];

  for (const w of workshops) {
    const staffIdsJson = instructorId ? JSON.stringify([instructorId]) : JSON.stringify([]);
    const res = await query(`
      INSERT INTO workshops 
      (title, category, description, date, time, price, capacity, enrolled, image_url, video_url, instructor, instructor_id, status, assigned_staff_ids)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING id, title
    `, [
      w.title, w.category, w.description, w.date, w.time,
      w.price, w.capacity, 0, w.image_url,
      w.video_url, w.instructor, w.instructor_id, w.status, staffIdsJson
    ]);

    const ws = res.rows[0];
    createdWorkshops.push(ws);
    console.log(`   ✨ Created Workshop: "${ws.title}" [ID: ${ws.id}]`);

    // 5. Enroll each attendee into this workshop in 'attendees' table & trigger email
    let count = 0;
    for (const a of attendeesToEnroll) {
      await query(`
        INSERT INTO attendees 
        (workshop_id, name, email, phone, status, source, certificate_eligible, original_price, membership_tier, discount_amount, final_price)
        VALUES ($1, $2, $3, $4, 'REGISTERED', 'admin', TRUE, $5, 'Standard', '₹0 (0%)', $6)
      `, [ws.id, a.name, a.email, a.phone, `₹${w.price}`, `₹${w.price}`]);

      count++;

      // Send confirmation email directly to the attendee's email address
      try {
        await sendWorkshopEnrollmentEmail({
          to: a.email,
          userName: a.name,
          workshopTitle: ws.title,
          date: w.date,
          time: w.time,
          instructorName: w.instructor
        });
        console.log(`      📧 Confirmation email sent to ${a.name} (${a.email})`);
      } catch (emailErr) {
        console.error(`      ⚠️ Email dispatch warning for ${a.email}:`, emailErr.message);
      }
    }

    // Update enrolled count
    await query(`UPDATE workshops SET enrolled = $1 WHERE id = $2`, [count, ws.id]);
  }

  console.log("\n==========================================");
  console.log("🎉 5 WORKSHOPS CREATED & ATTENDEES ENROLLED WITH EMAILS!");
  console.log("==========================================\n");

  process.exit(0);
}

seedWorkshopsAndEnrollAttendees().catch(err => {
  console.error("❌ Seed error:", err);
  process.exit(1);
});
