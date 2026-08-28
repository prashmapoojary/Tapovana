const { query } = require('../src/config/db');

async function seedVedicPackages() {
  console.log("🌟 --- SEEDING NEW VEDIC LIFE PACKAGES --- 🌟\n");

  // 1. Delete all existing old packages and related records
  console.log("1️⃣ Clearing old packages and allocations...");
  await query("DELETE FROM vedic_program_staff").catch(() => {});
  await query("DELETE FROM vedic_program_attendees").catch(() => {});
  await query("DELETE FROM vedic_package_members").catch(() => {});
  await query("DELETE FROM allocations WHERE type = 'vedic_program'").catch(() => {});
  await query("DELETE FROM vedic_programs").catch(() => {});
  console.log("   ✅ Cleared old packages!");

  // 2. Fetch a default doctor/therapist for lead consultant optional assignment
  const staffRes = await query(`
    SELECT tm.id 
    FROM team_members tm 
    JOIN roles r ON tm.role_id = r.id 
    WHERE r.name IN ('Doctor', 'Therapist') AND tm.status = 'active'
    LIMIT 1
  `);
  const leadId = staffRes.rows.length ? staffRes.rows[0].id : null;

  // 3. New 5 valid packages with Unsplash images
  const packages = [
    {
      title: "Pancha Karma Detox & Rejuvenation Retreat",
      type: "Detox & Healing",
      description: "A traditional 7-day Panchakarma detoxification program designed to cleanse bodily toxins, restore dosha equilibrium, and boost immunity with personalized Ayurvedic therapies.",
      duration: "7 Days / 6 Nights",
      start_date: "2026-09-01",
      end_date: "2026-09-07",
      capacity: 25,
      price: 15000,
      accommodations: "Luxury Ayurvedic Villa (Full Board)",
      services: JSON.stringify(["Panchakarma Therapy", "Full Body Abhyanga", "Shirodhara", "Sattvic Organic Diet", "Daily Yoga & Meditation"]),
      languages: JSON.stringify(["English", "Hindi"]),
      image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
      registration_deadline: "2026-08-30",
      status: "Upcoming"
    },
    {
      title: "Kaya Kalpa Anti-Aging & Longevity Immersion",
      type: "Longevity & Rejuvenation",
      description: "Ancient Rasayana cellular rejuvenation therapy designed to slow biological aging, improve vitality, strengthen nervous system, and restore inner youthfulness.",
      duration: "14 Days / 13 Nights",
      start_date: "2026-09-10",
      end_date: "2026-09-23",
      capacity: 20,
      price: 28000,
      accommodations: "Wellness Suite with Garden View",
      services: JSON.stringify(["Rasayana Therapy", "Cellular Detox", "Herbal Baths", "Pranayama & Chakra Healing", "Personalized Herbal Formulas"]),
      languages: JSON.stringify(["English", "Hindi", "Sanskrit"]),
      image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
      registration_deadline: "2026-09-05",
      status: "Upcoming"
    },
    {
      title: "Mindfulness, Pranayama & Stress Relief Intensive",
      type: "Mind & Meditation",
      description: "Transformative 5-day retreat focusing on deep stress dissolution, mental clarity, autonomic nervous system reset, and mindfulness practices led by expert acharyas.",
      duration: "5 Days / 4 Nights",
      start_date: "2026-09-15",
      end_date: "2026-09-19",
      capacity: 30,
      price: 12000,
      accommodations: "Serene Eco-Cottage",
      services: JSON.stringify(["Yoga Nidra", "Mindfulness Meditation", "Sound Healing", "Stress Counseling", "Silent Forest Walks"]),
      languages: JSON.stringify(["English", "Hindi"]),
      image_url: "https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=1200&q=80",
      registration_deadline: "2026-09-12",
      status: "Upcoming"
    },
    {
      title: "Ayurvedic Immune & Digestive Health Program",
      type: "Digestive & Immunity",
      description: "Targeted gut health restoration program addressing Agni (digestive fire), metabolic disorders, and chronic inflammation using tailored dietetics and herbal remedies.",
      duration: "10 Days / 9 Nights",
      start_date: "2026-10-01",
      end_date: "2026-10-10",
      capacity: 20,
      price: 21000,
      accommodations: "Wellness Deluxe Room",
      services: JSON.stringify(["Agni Balancing Therapy", "Custom Diet Blueprint", "Abdominal Basti", "Herbal Cooking Workshop", "Daily Herbal Teas"]),
      languages: JSON.stringify(["English", "Hindi"]),
      image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=80",
      registration_deadline: "2026-09-28",
      status: "Upcoming"
    },
    {
      title: "Spiritual Awakening & Holistic Yoga Intensive",
      type: "Spiritual & Yoga",
      description: "Immersive 7-day holistic yoga retreat integrating classical Hatha Yoga, Vedic philosophy, mantra chanting, and sacred ritual practices for spiritual elevation.",
      duration: "7 Days / 6 Nights",
      start_date: "2026-10-15",
      end_date: "2026-10-21",
      capacity: 25,
      price: 18000,
      accommodations: "Himalayan View Pavilion Suite",
      services: JSON.stringify(["Hatha & Ashtanga Yoga", "Vedic Chanting", "Fire Ceremony (Yajna)", "Guided Meditation", "Sattvic Meals"]),
      languages: JSON.stringify(["English", "Hindi"]),
      image_url: "https://images.unsplash.com/photo-1599447421416-3414500d18a5?auto=format&fit=crop&w=1200&q=80",
      registration_deadline: "2026-10-10",
      status: "Upcoming"
    }
  ];

  console.log("\n2️⃣ Inserting 5 new valid Vedic Life packages...");
  for (const pkg of packages) {
    const res = await query(`
      INSERT INTO vedic_programs 
      (title, type, description, duration, start_date, end_date, capacity, price, accommodations, lead_consultant_id, services, languages, image_url, registration_deadline, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15) RETURNING id, title
    `, [
      pkg.title, pkg.type, pkg.description, pkg.duration,
      pkg.start_date, pkg.end_date, pkg.capacity, pkg.price,
      pkg.accommodations, leadId, pkg.services, pkg.languages,
      pkg.image_url, pkg.registration_deadline, pkg.status
    ]);
    console.log(`   ✨ Created: "${res.rows[0].title}" [ID: ${res.rows[0].id}]`);
  }

  console.log("\n==========================================");
  console.log("🎉 5 VEDIC LIFE PACKAGES SEEDED SUCCESSFULLY!");
  console.log("==========================================\n");

  process.exit(0);
}

seedVedicPackages().catch(err => {
  console.error("❌ Error seeding packages:", err);
  process.exit(1);
});
