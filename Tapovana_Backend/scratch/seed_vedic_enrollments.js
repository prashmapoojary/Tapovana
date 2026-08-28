const { query } = require('../src/config/db');

async function seedVedicEnrollments() {
  console.log("=== ENROLLING ATTENDEES FOR VEDIC LIFE PROGRAMS ===");

  const enrollments = [
    // Program 40: Pancha Karma Detox & Rejuvenation Retreat
    { program_id: 40, name: "Suresh Menon", email: "suresh.menon@gmail.com", phone: "9876543210", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 40, name: "Ananya Roy", email: "ananya.roy@gmail.com", phone: "9876543211", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 40, name: "Vikram Rao", email: "vikram.rao@gmail.com", phone: "9876543212", accommodation: "Deluxe Villa (Private)", payment: "CONFIRMED" },
    { program_id: 40, name: "Deepak Joshi", email: "deepak.joshi@gmail.com", phone: "9876543213", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 40, name: "Kavita Reddy", email: "kavita.reddy@gmail.com", phone: "9876543214", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 40, name: "Neha Deshmukh", email: "neha.deshmukh@gmail.com", phone: "9876543215", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 40, name: "Karthik Rao", email: "karthikrao608@gmail.com", phone: "9876543216", accommodation: "Deluxe Villa (Private)", payment: "PAID" },

    // Program 41: Kaya Kalpa Anti-Aging & Longevity Immersion
    { program_id: 41, name: "Rajesh Sharma", email: "rajesh.sharma@gmail.com", phone: "9876543220", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 41, name: "Priya Nair", email: "priya.nair@gmail.com", phone: "9876543221", accommodation: "Deluxe Villa (Private)", payment: "PAID" },
    { program_id: 41, name: "Amitabh Sen", email: "amitabh.sen@gmail.com", phone: "9876543222", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 41, name: "Sunita Verma", email: "sunita.verma@gmail.com", phone: "9876543223", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 41, name: "Mahesh Patil", email: "mahesh.patil@gmail.com", phone: "9876543224", accommodation: "Standard Room (Shared)", payment: "PAID" },

    // Program 42: Mindfulness, Pranayama & Stress Relief Intensive
    { program_id: 42, name: "Meera Hegde", email: "meera.hegde@gmail.com", phone: "9876543230", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 42, name: "Arjun Bhat", email: "arjun.bhat@gmail.com", phone: "9876543231", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 42, name: "Divya Kulal", email: "divya.kulal@gmail.com", phone: "9876543232", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 42, name: "Girish Kulkarni", email: "girish.kulkarni@gmail.com", phone: "9876543233", accommodation: "Deluxe Villa (Private)", payment: "PAID" },

    // Program 43: Ayurvedic Immune & Digestive Health Program
    { program_id: 43, name: "Rohan Poojary", email: "rohan.poojary@gmail.com", phone: "9876543240", accommodation: "Standard Room (Shared)", payment: "PAID" },
    { program_id: 43, name: "Aswathi Pillai", email: "aswathi.pillai@gmail.com", phone: "9876543241", accommodation: "Deluxe Suite (Single Occupancy)", payment: "PAID" },
    { program_id: 43, name: "Nikhil Shetty", email: "nikhil.shetty@gmail.com", phone: "9876543242", accommodation: "Standard Room (Shared)", payment: "PAID" },

    // Program 44: Spiritual Awakening & Holistic Yoga Intensive
    { program_id: 44, name: "Swati Kamath", email: "swati.kamath@gmail.com", phone: "9876543250", accommodation: "Deluxe Villa (Private)", payment: "PAID" },
    { program_id: 44, name: "Venkatesh Rao", email: "venkatesh.rao@gmail.com", phone: "9876543251", accommodation: "Standard Room (Shared)", payment: "PAID" }
  ];

  for (const e of enrollments) {
    await query(
      `INSERT INTO vedic_attendees (program_id, name, email, phone, accommodation_type, payment_status, status, source)
       VALUES ($1, $2, $3, $4, $5, $6, 'CONFIRMED', 'admin')
       ON CONFLICT DO NOTHING`,
      [e.program_id, e.name, e.email, e.phone, e.accommodation, e.payment]
    );
  }

  // Update enrolled counts in vedic_programs
  await query(`
    UPDATE vedic_programs vp
    SET enrolled = (SELECT COUNT(*) FROM vedic_attendees va WHERE va.program_id = vp.id);
  `);

  console.log("✅ Enrolled attendees into Vedic Life Programs successfully!");
  process.exit(0);
}

seedVedicEnrollments();
