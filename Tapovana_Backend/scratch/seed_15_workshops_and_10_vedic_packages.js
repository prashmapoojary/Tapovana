const { query } = require('../src/config/db');

const attendeesList = [
  { name: "Prashma Poojary", email: "prashmapoojary@gmail.com", phone: "7411795077" },
  { name: "Nagaprasad Salian", email: "saliannagaprasad22@gmail.com", phone: "7204582972" },
  { name: "Sushma Poojari", email: "sushpoojari.28@gmail.com", phone: "9876543210" },
  { name: "Prash", email: "29prashma10@gmail.com", phone: "6578908765" },
  { name: "Karthik Rao", email: "karthikrao608@gmail.com", phone: "6786543245" },
  { name: "Prashma Salian", email: "prashma2910@gmail.com", phone: "9148891703" }
];

const workshopData = [
  // Day 1: Aug 26, 2026
  {
    title: "Ayurvedic Gut Health & Agni Mastery",
    category: "Ayurveda",
    date: "2026-08-26",
    time: "10:00 AM - 12:00 PM",
    startTime: "2026-08-26T10:00:00+05:30",
    endTime: "2026-08-26T12:00:00+05:30",
    duration: 120,
    price: 1500,
    instructor: "Dr. Nagaprasad Salian",
    image_url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    description: "Master digestive fire (Agni) through classical herbs, spices, and dietary protocols to eliminate Ama."
  },
  {
    title: "Vedic Pranayama & Breath Control Workshop",
    category: "Yoga",
    date: "2026-08-26",
    time: "10:00 AM - 12:00 PM", // SAME DATE & SAME TIME AS WORKSHOP 1!
    startTime: "2026-08-26T10:00:00+05:30",
    endTime: "2026-08-26T12:00:00+05:30",
    duration: 120,
    price: 1200,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description: "Learn traditional Nadi Shodhana and Bhramari breathwork for nervous system stability and deep clarity."
  },
  {
    title: "Holistic Herbal Tea Formulation & Spices",
    category: "Nutrition",
    date: "2026-08-26",
    time: "03:00 PM - 05:00 PM", // SAME DATE, DIFFERENT TIME!
    startTime: "2026-08-26T15:00:00+05:30",
    endTime: "2026-08-26T17:00:00+05:30",
    duration: 120,
    price: 1000,
    instructor: "Dr. Sushma Poojary",
    image_url: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=1200&q=80",
    description: "Craft personalized herbal tea infusions targeting Vata, Pitta, and Kapha dosha balances."
  },

  // Day 2: Aug 27, 2026
  {
    title: "Marma Point Therapy & Energy Flow",
    category: "Ayurveda",
    date: "2026-08-27",
    time: "10:00 AM - 12:00 PM",
    startTime: "2026-08-27T10:00:00+05:30",
    endTime: "2026-08-27T12:00:00+05:30",
    duration: 120,
    price: 1800,
    instructor: "Dr. Nagaprasad Salian",
    image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    description: "Discover the 107 vital energy points (Marmas) and pressure techniques to unblock vital Prana."
  },
  {
    title: "Asana Alignment for Spinal Flexibility",
    category: "Yoga",
    date: "2026-08-27",
    time: "10:00 AM - 12:00 PM", // SAME DATE & SAME TIME AS WORKSHOP 4!
    startTime: "2026-08-27T10:00:00+05:30",
    endTime: "2026-08-27T12:00:00+05:30",
    duration: 120,
    price: 1300,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    description: "Precision posture alignment to relieve lumbar tension, improve gait, and strengthen core muscles."
  },
  {
    title: "Sound Healing & Singing Bowl Meditation",
    category: "Wellness",
    date: "2026-08-27",
    time: "03:00 PM - 05:00 PM", // SAME DATE, DIFFERENT TIME!
    startTime: "2026-08-27T15:00:00+05:30",
    endTime: "2026-08-27T17:00:00+05:30",
    duration: 120,
    price: 1600,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=1200&q=80",
    description: "Immerse in acoustic acoustic frequency therapy using Tibetan singing bowls for parasympathetic reset."
  },

  // Day 3: Aug 28, 2026
  {
    title: "Ayurvedic Dinacharya Morning Rituals",
    category: "Ayurveda",
    date: "2026-08-28",
    time: "10:00 AM - 12:00 PM",
    startTime: "2026-08-28T10:00:00+05:30",
    endTime: "2026-08-28T12:00:00+05:30",
    duration: 120,
    price: 1100,
    instructor: "Dr. Nagaprasad Salian",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    description: "Practical hands-on workshop covering oil pulling, tongue scraping, and body brushing techniques."
  },
  {
    title: "Chakra Balancing & Kundalini Energy",
    category: "Yoga",
    date: "2026-08-28",
    time: "10:00 AM - 12:00 PM", // SAME DATE & SAME TIME AS WORKSHOP 7!
    startTime: "2026-08-28T10:00:00+05:30",
    endTime: "2026-08-28T12:00:00+05:30",
    duration: 120,
    price: 1400,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description: "Align your 7 energy centers through targeted Bija mantras, visualization, and mudra postures."
  },
  {
    title: "Plant-Based Sattvic Cooking Masterclass",
    category: "Nutrition",
    date: "2026-08-28",
    time: "03:00 PM - 05:00 PM", // SAME DATE, DIFFERENT TIME!
    startTime: "2026-08-28T15:00:00+05:30",
    endTime: "2026-08-28T17:00:00+05:30",
    duration: 120,
    price: 2000,
    instructor: "Dr. Sushma Poojary",
    image_url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    description: "Learn to cook delicious Kitchari, spiced dhal, and herbal chutneys using organic medicinal ingredients."
  },

  // Day 4: Aug 29, 2026
  {
    title: "Rasayana & Anti-Aging Herbal Therapies",
    category: "Ayurveda",
    date: "2026-08-29",
    time: "10:00 AM - 12:00 PM",
    startTime: "2026-08-29T10:00:00+05:30",
    endTime: "2026-08-29T12:00:00+05:30",
    duration: 120,
    price: 1700,
    instructor: "Dr. Nagaprasad Salian",
    image_url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    description: "Explore botanical formulas like Ashwagandha and Shatavari to enhance cellular longevity and Ojas."
  },
  {
    title: "Yoganidra Deep Relaxation & Stress Relief",
    category: "Yoga",
    date: "2026-08-29",
    time: "10:00 AM - 12:00 PM", // SAME DATE & SAME TIME AS WORKSHOP 10!
    startTime: "2026-08-29T10:00:00+05:30",
    endTime: "2026-08-29T12:00:00+05:30",
    duration: 120,
    price: 1250,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=1200&q=80",
    description: "Guided psychic sleep meditation technique allowing profound neural recovery and stress release."
  },
  {
    title: "Ayurvedic Skincare & Herbal Ubtan Making",
    category: "Wellness",
    date: "2026-08-29",
    time: "03:00 PM - 05:00 PM", // SAME DATE, DIFFERENT TIME!
    startTime: "2026-08-29T15:00:00+05:30",
    endTime: "2026-08-29T17:00:00+05:30",
    duration: 120,
    price: 1500,
    instructor: "Dr. Sushma Poojary",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    description: "Handcraft chemical-free face packs, natural scrub pastes, and skin elixirs customized by dosha."
  },

  // Day 5: Aug 30, 2026
  {
    title: "Joint Health & Panchakarma Recovery",
    category: "Ayurveda",
    date: "2026-08-30",
    time: "10:00 AM - 12:00 PM",
    startTime: "2026-08-30T10:00:00+05:30",
    endTime: "2026-08-30T12:00:00+05:30",
    duration: 120,
    price: 1900,
    instructor: "Dr. Nagaprasad Salian",
    image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    description: "Therapeutic joint oil infusions, Shallaki remedies, and gentle movements for arthritis management."
  },
  {
    title: "Pranayama for Cardiovascular Wellness",
    category: "Yoga",
    date: "2026-08-30",
    time: "10:00 AM - 12:00 PM", // SAME DATE & SAME TIME AS WORKSHOP 13!
    startTime: "2026-08-30T10:00:00+05:30",
    endTime: "2026-08-30T12:00:00+05:30",
    duration: 120,
    price: 1350,
    instructor: "Therapist Shivaranjini Poojary",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description: "Breathing protocols to normalize heart rate variability, reduce hypertension, and soothe anxiety."
  },
  {
    title: "Mindful Detoxification & Juicing Workshop",
    category: "Nutrition",
    date: "2026-08-30",
    time: "03:00 PM - 05:00 PM", // SAME DATE, DIFFERENT TIME!
    startTime: "2026-08-30T15:00:00+05:30",
    endTime: "2026-08-30T17:00:00+05:30",
    duration: 120,
    price: 1450,
    instructor: "Dr. Sushma Poojary",
    image_url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    description: "Discover fresh green juicing blend recipes balanced with digestive spices to ignite metabolism."
  }
];

const vedicPackageData = [
  // 3 Days Packages (3 packages)
  {
    title: "3-Day Essential Agni & Gut Reset Package",
    duration: "3 days",
    startDate: "2026-08-26",
    endDate: "2026-08-28",
    price: 8500,
    capacity: 20,
    type: "Vedic Package",
    accommodations: "Deluxe Eco Cottage",
    image_url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=1200&q=80",
    description: "A comprehensive 3-day intensive Ayurvedic retreat focused on resetting digestive Agni, abdominal Abhyanga, and customized Kitchari nutrition."
  },
  {
    title: "3-Day Stress Relief & Shirodhara Retreat",
    duration: "3 days",
    startDate: "2026-08-26",
    endDate: "2026-08-28",
    price: 9800,
    capacity: 15,
    type: "Vedic Package",
    accommodations: "Serenity Suite",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description: "Soothe hyperactive Vata and mental exhaustion with daily warm oil Shirodhara head treatments, Yoganidra, and relaxing herbal teas."
  },
  {
    title: "3-Day Detox & Immunity Boost Program",
    duration: "3 days",
    startDate: "2026-08-27",
    endDate: "2026-08-29",
    price: 9200,
    capacity: 20,
    type: "Vedic Package",
    accommodations: "Standard Wellness Room",
    image_url: "https://images.unsplash.com/photo-1512290900673-8a39529b4703?auto=format&fit=crop&w=1200&q=80",
    description: "Rapid immune rejuvenation featuring tri-doshic steam baths, herbal Rasayana tonics, and morning Pranayama sessions."
  },

  // 1 Week (7 Days) Packages (4 packages)
  {
    title: "1-Week Full Panchakarma Detox & Rejuvenation",
    duration: "1 week",
    startDate: "2026-08-26",
    endDate: "2026-09-01",
    price: 24500,
    capacity: 15,
    type: "Vedic Package",
    accommodations: "Luxury Ayurvedic Villa",
    image_url: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=1200&q=80",
    description: "Classical 7-day Panchakarma protocol including Abhyanga, Swedana, Virechana, and Nasya therapies supervised by senior Ayurvedic physicians."
  },
  {
    title: "1-Week Holistic Weight Management & Metabolism Renewal",
    duration: "1 week",
    startDate: "2026-08-27",
    endDate: "2026-09-02",
    price: 22000,
    capacity: 20,
    type: "Vedic Package",
    accommodations: "Garden View Cottage",
    image_url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80",
    description: "Targeted Kapha balancing program featuring Udvarthanam dry powder massage, active Yoga flow, and customized fat-burning herbal formulations."
  },
  {
    title: "1-Week Spinal Care & Joint Mobility Package",
    duration: "1 week",
    startDate: "2026-08-28",
    endDate: "2026-09-03",
    price: 23500,
    capacity: 15,
    type: "Vedic Package",
    accommodations: "Premium Heritage Room",
    image_url: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80",
    description: "Specialized joint rehabilitation utilizing Janu Basti, Kati Basti oil pooling, Shallaki supplements, and gentle therapeutic movement."
  },
  {
    title: "1-Week Women's Hormonal Health & Vitality Sanctuary",
    duration: "1 week",
    startDate: "2026-08-29",
    endDate: "2026-09-04",
    price: 25000,
    capacity: 12,
    type: "Vedic Package",
    accommodations: "Executive Wellness Suite",
    image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=80",
    description: "Tailored endocrine balancing program for PCOS, thyroid health, and reproductive rejuvenation incorporating Shatavari therapies and Marma healing."
  },

  // 15 Days Packages (3 packages)
  {
    title: "15-Day Deep Kaya Kalpa Cellular Longevity Retreat",
    duration: "15 days",
    startDate: "2026-08-26",
    endDate: "2026-09-09",
    price: 48000,
    capacity: 10,
    type: "Vedic Package",
    accommodations: "Royal Tapovana Suite",
    image_url: "https://images.unsplash.com/photo-1511295742362-92c96b124e52?auto=format&fit=crop&w=1200&q=80",
    description: "Our signature 15-day transformation retreat combining deep tissue detoxification, daily Rasayana therapies, individual consultation, and meditation."
  },
  {
    title: "15-Day Chronic Disease Management & Rehabilitation",
    duration: "15 days",
    startDate: "2026-08-28",
    endDate: "2026-09-11",
    price: 46000,
    capacity: 10,
    type: "Vedic Package",
    accommodations: "Deluxe Eco Cottage",
    image_url: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=1200&q=80",
    description: "Comprehensive medical management for autoimmune, metabolic, and chronic inflammatory conditions under constant physician care."
  },
  {
    title: "15-Day Ultimate Mind-Body Spiritual Immersion",
    duration: "15 days",
    startDate: "2026-08-30",
    endDate: "2026-09-13",
    price: 52000,
    capacity: 8,
    type: "Vedic Package",
    accommodations: "Private Sanctorum Villa",
    image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=1200&q=80",
    description: "An intensive immersion into classical Ashtanga Yoga, Vedic chanting, silent meditation, and complete Panchakarma purification."
  }
];

async function seedWorkshopsAndPackages() {
  try {
    console.log("1. Ensuring all 6 attendees exist in customers table...");
    for (const att of attendeesList) {
      const parts = att.name.split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      const existing = await query("SELECT id FROM customers WHERE LOWER(email) = LOWER($1)", [att.email]);
      if (existing.rows.length === 0) {
        await query(`
          INSERT INTO customers (name, first_name, last_name, email, phone, status)
          VALUES ($1, $2, $3, $4, $5, 'Active')
        `, [att.name, firstName, lastName, att.email, att.phone]);
      } else {
        await query(`
          UPDATE customers SET name = $1, phone = $2 WHERE id = $3
        `, [att.name, att.phone, existing.rows[0].id]);
      }
    }
    console.log("✓ Customers verified.");

    console.log("\n2. Seeding 15 Workshops (3 per day, 2 at same date & time, 1 at different time)...");
    let createdWorkshops = [];

    for (let i = 0; i < workshopData.length; i++) {
      const w = workshopData[i];
      const res = await query(`
        INSERT INTO workshops (
          title, category, date, time, start_time, end_time, duration, capacity, enrolled,
          price, status, instructor, description, image_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, 30, $8,
          $9, 'Upcoming', $10, $11, $12, NOW(), NOW()
        ) RETURNING id, title, date, time
      `, [
        w.title, w.category, w.date, w.time, w.startTime, w.endTime, w.duration,
        attendeesList.length, w.price, w.instructor, w.description, w.image_url
      ]);

      const workshopId = res.rows[0].id;
      createdWorkshops.push(workshopId);
      console.log(`✓ Workshop ${i + 1}/15: ID ${workshopId} | ${w.date} [${w.time}] - "${w.title}"`);

      // Add all 6 attendees to this workshop
      for (const att of attendeesList) {
        await query(`
          INSERT INTO attendees (
            workshop_id, name, email, phone, status, certificate_eligible, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 'enrolled', true, NOW(), NOW()
          )
        `, [workshopId, att.name, att.email, att.phone]);
      }
    }

    console.log("\n3. Seeding 10 Vedic Packages (3 days, 1 week, 15 days)...");
    for (let i = 0; i < vedicPackageData.length; i++) {
      const p = vedicPackageData[i];
      const res = await query(`
        INSERT INTO vedic_programs (
          title, type, duration, start_date, end_date, capacity, enrolled,
          price, status, description, accommodations, image_url, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7,
          $8, 'Active', $9, $10, $11, NOW(), NOW()
        ) RETURNING id, title, duration
      `, [
        p.title, p.type, p.duration, p.startDate, p.endDate, p.capacity, attendeesList.length,
        p.price, p.description, p.accommodations, p.image_url
      ]);

      const programId = res.rows[0].id;
      console.log(`✓ Vedic Package ${i + 1}/10: ID ${programId} | ${p.duration} - "${p.title}"`);

      // Add all 6 attendees to vedic_attendees and vedic_packages_members
      for (const att of attendeesList) {
        const attRes = await query(`
          INSERT INTO vedic_attendees (
            program_id, name, email, phone, status, payment_status, check_in_date, check_out_date, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, 'CONFIRMED', 'PAID', $5, $6, NOW(), NOW()
          ) RETURNING id
        `, [programId, att.name, att.email, att.phone, p.startDate, p.endDate]);

        const vedicAttId = attRes.rows[0].id;

        await query(`
          INSERT INTO vedic_packages_members (
            program_id, vedic_attendee_id, name, email, phone, status, payment_status, check_in_date, check_out_date, created_at, updated_at
          ) VALUES (
            $1, $2, $3, $4, $5, 'CONFIRMED', 'PAID', $6, $7, NOW(), NOW()
          )
        `, [programId, vedicAttId, att.name, att.email, att.phone, p.startDate, p.endDate]);
      }
    }

    console.log("\n🎉 ALL 15 WORKSHOPS & 10 VEDIC PACKAGES SEEDED WITH 6 ATTENDEES EACH SUCCESSFULLY!");
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to seed workshops and packages:", err);
    process.exit(1);
  }
}

seedWorkshopsAndPackages();
