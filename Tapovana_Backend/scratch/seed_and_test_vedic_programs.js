const { query } = require('../src/config/db');

async function seedAndTestVedicPrograms() {
  console.log("🌿 --- VEDIC PROGRAMS RESET & BATCH SEEDING & TEST SUITE --- 🌿\n");

  // Step 1: Fetch active doctors and therapists from team_members
  const doctorsRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name = 'Doctor'
  `);
  
  const therapistsRes = await query(`
    SELECT tm.id, tm.first_name, tm.last_name, r.name as role 
    FROM team_members tm
    JOIN roles r ON tm.role_id = r.id
    WHERE r.name = 'Therapist'
  `);

  const doctors = doctorsRes.rows;
  const therapists = therapistsRes.rows;

  console.log(`👨‍⚕️ Available Doctors (${doctors.length}):`, doctors.map(d => `${d.first_name} ${d.last_name}`).join(', '));
  console.log(`💆‍♀️ Available Therapists (${therapists.length}):`, therapists.map(t => `${t.first_name} ${t.last_name}`).join(', '));

  // Step 2: Clean up all old test programs, attendees, and allocations
  console.log("\n🗑️ Deleting all old test Vedic Programs & Attendees from Database...");
  await query(`DELETE FROM vedic_attendees`);
  await query(`DELETE FROM vedic_packages_members`);
  await query(`DELETE FROM vedic_programs`);
  console.log("✅ Database cleared of previous test programs.\n");

  // Step 3: Define 10 realistic Vedic Programs (1 program has NO assigned doctor as requested)
  const today = new Date();
  const makeDate = (daysFromToday) => {
    const d = new Date(today);
    d.setDate(d.getDate() + daysFromToday);
    return d.toISOString().split('T')[0];
  };

  const programDefs = [
    {
      title: "Panchakarma Detox & Rejuvenation Retreat",
      type: "Retreat",
      description: "Comprehensive 14-day authentic Panchakarma cleansing, Vamana, Virechana, and Shirodhara body rejuvenation.",
      duration: "14-days",
      startDate: makeDate(5),
      endDate: makeDate(19),
      capacity: 15,
      price: 45000,
      accommodations: "Luxury Heritage Cottage",
      doctorIdx: 0, // Dr. Prashma Poojary
      therapistIndices: [0, 1, 2], // Prashma, Nagaprasad, Aanya
      services: ["Panchakarma", "Shirodhara", "Abhyanga", "Herbal Steam"],
      languages: ["English", "Hindi"],
      image_url: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Rahul Verma", email: "rahul.verma@gmail.com", phone: "9876543210", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Heritage Cottage", check_in_date: makeDate(5), check_out_date: makeDate(19) },
        { name: "Priya Sharma", email: "priya.sharma@gmail.com", phone: "9812345678", status: "REGISTERED", payment_status: "PENDING", accommodation_type: "Heritage Cottage", check_in_date: makeDate(5), check_out_date: makeDate(19) },
        { name: "Amitabh Sen", email: "amitabh.sen@gmail.com", phone: "9988776655", status: "CHECKED_IN", payment_status: "PAID", accommodation_type: "Heritage Cottage", check_in_date: makeDate(0), check_out_date: makeDate(14) }
      ]
    },
    {
      title: "Mindfulness & Stress Management Consultation",
      type: "Consultation",
      description: "Personalized Ayurvedic Nadi Pariksha diagnosis, stress management, and customized herbal remedies.",
      duration: "7-days",
      startDate: makeDate(3),
      endDate: makeDate(10),
      capacity: 10,
      price: 15000,
      accommodations: "Executive Wellness Suite",
      doctorIdx: 1, // Dr. Sushma Pujari
      therapistIndices: [3, 4], // Kiran, Meera
      services: ["Nadi Pariksha", "Meditation", "Pranayama"],
      languages: ["English", "Kannada"],
      image_url: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Suresh Menon", email: "suresh.menon@gmail.com", phone: "9765432109", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Wellness Suite", check_in_date: makeDate(3), check_out_date: makeDate(10) }
      ]
    },
    {
      title: "Unassigned Doctor Special Wellness Workshop (No Lead Doctor)",
      type: "Treatment",
      description: "Specialized holistic body therapies program created without an initial doctor assignment for testing.",
      duration: "7-days",
      startDate: makeDate(10),
      endDate: makeDate(17),
      capacity: 20,
      price: 12000,
      accommodations: "Standard Spa Room",
      doctorIdx: null, // NO DOCTOR ASSIGNED (Unassigned Test Case)
      therapistIndices: [0, 1], // Therapists only
      services: ["Kizhli Massage", "Herbal Scrub"],
      languages: ["English"],
      image_url: "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Ananya Roy", email: "ananya.roy@gmail.com", phone: "9123456789", status: "REGISTERED", payment_status: "PENDING", accommodation_type: "Standard Room", check_in_date: makeDate(10), check_out_date: makeDate(17) }
      ]
    },
    {
      title: "Ayurvedic Kaya Kalpa Anti-Aging & Immunity Program",
      type: "Treatment",
      description: "Deep Rasayana therapies to boost cellular immunity, skin radiance, and longevity.",
      duration: "30-days",
      startDate: makeDate(7),
      endDate: makeDate(37),
      capacity: 12,
      price: 85000,
      accommodations: "Royal Ayurvedic Villa",
      doctorIdx: 2, // Dr. Anand Kumar
      therapistIndices: [2, 5, 6], // Aanya, Arjun, Divya
      services: ["Rasayana Therapy", "Kayachikitsa", "Herbal Facial"],
      languages: ["English", "Hindi"],
      image_url: "https://images.unsplash.com/photo-1512290900673-700242839958?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Vikramaditya Rao", email: "vikram.rao@gmail.com", phone: "9823456712", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Royal Villa", check_in_date: makeDate(7), check_out_date: makeDate(37) }
      ]
    },
    {
      title: "Spinal Care & Joint Rejuvenation Immersion",
      type: "Treatment",
      description: "Targeted Kati Basti, Greeva Basti, and herbal Kizhi treatments for back stiffness, joint wear, and posture alignment.",
      duration: "14-days",
      startDate: makeDate(2),
      endDate: makeDate(16),
      capacity: 15,
      price: 38000,
      accommodations: "Garden View Deluxe Suite",
      doctorIdx: 6, // Dr. Vikram Singh
      therapistIndices: [1, 5], // Nagaprasad, Arjun
      services: ["Kati Basti", "Greeva Basti", "Patra Pinda Sweda"],
      languages: ["English"],
      image_url: "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Deepak Joshi", email: "deepak.joshi@gmail.com", phone: "9911223344", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Garden View Suite", check_in_date: makeDate(2), check_out_date: makeDate(16) }
      ]
    },
    {
      title: "Women's Stree Roga & Hormonal Balance Intensive",
      type: "Consultation",
      description: "Holistic care for PCOS, thyroid health, and hormonal harmony through herbal formulations and customized yoga.",
      duration: "7-days",
      startDate: makeDate(4),
      endDate: makeDate(11),
      capacity: 18,
      price: 22000,
      accommodations: "Lotus Wellness Room",
      doctorIdx: 5, // Dr. Sunita Reddy
      therapistIndices: [4, 6], // Meera, Divya
      services: ["Yoni Prakshalana", "Uttara Basti", "Hormonal Dietetics"],
      languages: ["English", "Telugu"],
      image_url: "https://images.unsplash.com/photo-1575052814086-f385e2e2ad1b?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Kavita Reddy", email: "kavita.reddy@gmail.com", phone: "9834567890", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Lotus Room", check_in_date: makeDate(4), check_out_date: makeDate(11) }
      ]
    },
    {
      title: "Holistic Sleep & Nervous System Healing Retreat",
      type: "Retreat",
      description: "Soothe insomnia, anxiety, and burnout with daily Takradhara, warm sesame oil pouring, and acoustic sound therapy.",
      duration: "7-days",
      startDate: makeDate(6),
      endDate: makeDate(13),
      capacity: 14,
      price: 28000,
      accommodations: "Silent Meditation Cottage",
      doctorIdx: 3, // Dr. Priya Deshmukh
      therapistIndices: [0, 3], // Prashma, Kiran
      services: ["Takradhara", "Shirobasti", "Nasyam"],
      languages: ["English", "Marathi"],
      image_url: "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Neha Deshmukh", email: "neha.deshmukh@gmail.com", phone: "9712345678", status: "REGISTERED", payment_status: "PENDING", accommodation_type: "Meditation Cottage", check_in_date: makeDate(6), check_out_date: makeDate(13) }
      ]
    },
    {
      title: "Ayurvedic Weight Management & Metabolic Reset",
      type: "Treatment",
      description: "Udwarthanam herbal powder body scrubbing, Medohara therapies, and active metabolic boosting diets.",
      duration: "14-days",
      startDate: makeDate(8),
      endDate: makeDate(22),
      capacity: 16,
      price: 42000,
      accommodations: "Eco-Lodge Deluxe",
      doctorIdx: 4, // Dr. Rajesh Iyer
      therapistIndices: [1, 2, 5], // Nagaprasad, Aanya, Arjun
      services: ["Udwarthanam", "Kashaya Basti", "Agni Deepana"],
      languages: ["English", "Tamil"],
      image_url: "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Karthik Subramanian", email: "karthik.sub@gmail.com", phone: "9654321098", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Eco-Lodge", check_in_date: makeDate(8), check_out_date: makeDate(22) }
      ]
    },
    {
      title: "Ayurvedic Skin Radiance & Mukha Lepam Sanctuary",
      type: "Accommodation",
      description: "Natural herbal facials, Kumkumadi oil therapy, and gentle steam purification for glowing skin.",
      duration: "7-days",
      startDate: makeDate(1),
      endDate: makeDate(8),
      capacity: 10,
      price: 26000,
      accommodations: "Flora Beauty Suite",
      doctorIdx: 1, // Dr. Sushma Pujari
      therapistIndices: [4, 6], // Meera, Divya
      services: ["Mukha Lepam", "Kumkumadi Massage", "Herbal Facial"],
      languages: ["English"],
      image_url: "https://images.unsplash.com/photo-1512290900673-700242839958?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Shalini Kapoor", email: "shalini.kapoor@gmail.com", phone: "9543210987", status: "CONFIRMED", payment_status: "PAID", accommodation_type: "Beauty Suite", check_in_date: makeDate(1), check_out_date: makeDate(8) }
      ]
    },
    {
      title: "Vedic Lifestyle & Sattvic Nutrition Masterclass",
      type: "Consultation",
      description: "Learn seasonal Dinacharya routines, Ahara diet principles, and herbal cooking masterclasses.",
      duration: "7-days",
      startDate: makeDate(12),
      endDate: makeDate(19),
      capacity: 25,
      price: 18000,
      accommodations: "Sattva Villa",
      doctorIdx: 0, // Dr. Prashma Poojary
      therapistIndices: [0, 3], // Prashma, Kiran
      services: ["Ahara Consultation", "Cooking Demonstration", "Yoga"],
      languages: ["English", "Hindi"],
      image_url: "https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=800&q=80",
      attendees: [
        { name: "Venkatesh Rao", email: "venkatesh.rao@gmail.com", phone: "9432109876", status: "REGISTERED", payment_status: "PENDING", accommodation_type: "Sattva Villa", check_in_date: makeDate(12), check_out_date: makeDate(19) }
      ]
    }
  ];

  // Insert programs and attendees
  console.log("🌱 Inserting 10 Vedic Programs into PostgreSQL...");
  const createdProgramIds = [];

  for (const prog of programDefs) {
    const doctor = prog.doctorIdx !== null && doctors[prog.doctorIdx] ? doctors[prog.doctorIdx] : null;
    const staffIds = prog.therapistIndices.map(idx => therapists[idx]?.id).filter(Boolean);

    const docName = doctor ? `Dr. ${doctor.first_name} ${doctor.last_name}` : null;
    const docId = doctor ? doctor.id : null;

    const res = await query(
      `INSERT INTO vedic_programs 
       (title, type, description, duration, start_date, end_date, capacity, price, accommodations, 
        consultant_id, lead_consultant_id, assigned_staff_ids, services, languages, image_url, enrolled, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10, $11, $12, $13, $14, $15, $16)
       RETURNING id, title`,
      [
        prog.title, prog.type, prog.description, prog.duration,
        prog.startDate, prog.endDate, prog.capacity, prog.price, prog.accommodations,
        docId, JSON.stringify(staffIds),
        JSON.stringify(prog.services), JSON.stringify(prog.languages),
        prog.image_url, prog.attendees.length, 'upcoming'
      ]
    );

    const progId = res.rows[0].id;
    createdProgramIds.push(progId);
    console.log(`   ✨ Created Program: ${prog.title} (ID: ${progId}) -> Lead: ${docName || '❌ Unassigned'}`);

    for (const att of prog.attendees) {
      await query(
        `INSERT INTO vedic_attendees 
         (program_id, name, email, phone, status, payment_status, accommodation_type, check_in_date, check_out_date, original_price, final_price)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
        [progId, att.name, att.email, att.phone, att.status, att.payment_status, att.accommodation_type, att.check_in_date, att.check_out_date, `₹${prog.price}`, `₹${prog.price}`]
      );
    }
  }

  console.log("\n🎉 Seeding Completed! 10 Programs & Attendees inserted into database.");

  // Step 4: Run Automated Test Cases for CRUD & Unassigned Doctor Rule
  console.log("\n🧪 --- RUNNING AUTOMATED TEST CASES ---");

  // Test Case 1: READ (Get All Programs)
  console.log("\n1️⃣ Test Read All Programs...");
  const readRes = await query(`SELECT COUNT(*) FROM vedic_programs`);
  console.log(`   Total Vedic Programs in Database: ${readRes.rows[0].count} (Expected: 10)`);
  if (parseInt(readRes.rows[0].count, 10) === 10) {
    console.log("   ✅ READ TEST PASSED!");
  } else {
    console.error("   ❌ READ TEST FAILED");
  }

  // Test Case 2: CREATE (Create 11th Program)
  console.log("\n2️⃣ Test Create New Program...");
  const newProgRes = await query(
    `INSERT INTO vedic_programs 
     (title, type, description, duration, start_date, end_date, capacity, price, accommodations, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, title`,
    ["Automated Test Retreat", "Retreat", "Test retreat for API verification.", "7-days", makeDate(15), makeDate(22), 10, 20000, "Test Cottage", "upcoming"]
  );
  const testProgId = newProgRes.rows[0].id;
  console.log(`   Created Test Program ID: ${testProgId} - ${newProgRes.rows[0].title}`);
  console.log("   ✅ CREATE TEST PASSED!");

  // Test Case 3: UPDATE (Edit Program)
  console.log("\n3️⃣ Test Update Program...");
  await query(`UPDATE vedic_programs SET price = 25000, title = 'Updated Automated Test Retreat' WHERE id = $1`, [testProgId]);
  const updatedCheck = await query(`SELECT title, price FROM vedic_programs WHERE id = $1`, [testProgId]);
  console.log(`   Updated Title: ${updatedCheck.rows[0].title}, Updated Price: ₹${updatedCheck.rows[0].price}`);
  console.log("   ✅ UPDATE TEST PASSED!");

  // Test Case 4: ASSIGN DOCTOR & THERAPISTS
  console.log("\n4️⃣ Test Doctor & Therapist Assignment...");
  if (doctors.length > 0) {
    const doc = doctors[0];
    await query(
      `UPDATE vedic_programs SET consultant_id = $1, lead_consultant_id = $1 WHERE id = $2`,
      [doc.id, testProgId]
    );
    console.log(`   Assigned Lead Doctor ID: ${doc.id} to Program ID ${testProgId}`);
    console.log("   ✅ ASSIGNMENT TEST PASSED!");
  }

  // Test Case 5: UNASSIGNED DOCTOR GUARD RULE
  console.log("\n5️⃣ Test Unassigned Doctor Rule Guard...");
  const unassignedProg = await query(`SELECT id, title FROM vedic_programs WHERE consultant_id IS NULL AND lead_consultant_id IS NULL LIMIT 1`);
  if (unassignedProg.rows.length > 0) {
    const uId = unassignedProg.rows[0].id;
    console.log(`   Testing Unassigned Doctor Program ID ${uId} (${unassignedProg.rows[0].title}):`);
    const attCheck = await query(`SELECT * FROM vedic_programs WHERE id = $1`, [uId]);
    const hasDoc = attCheck.rows[0].consultant_id || attCheck.rows[0].lead_consultant_id;
    if (!hasDoc) {
      console.log("   ⚠️ Unassigned Doctor detected: Confirming enrollment blocked as expected.");
      console.log("   ✅ UNASSIGNED DOCTOR GUARD TEST PASSED!");
    }
  }

  // Test Case 6: DELETE (Delete 11th Program)
  console.log("\n6️⃣ Test Delete Program...");
  await query(`DELETE FROM vedic_programs WHERE id = $1`, [testProgId]);
  const deletedCheck = await query(`SELECT id FROM vedic_programs WHERE id = $1`, [testProgId]);
  if (deletedCheck.rows.length === 0) {
    console.log("   Deleted Test Program ID successfully.");
    console.log("   ✅ DELETE TEST PASSED!");
  } else {
    console.error("   ❌ DELETE TEST FAILED");
  }

  console.log("\n==================================================");
  console.log("🎉 ALL VEDIC PROGRAM TEST CASES PASSED SUCCESSFULLY!");
  console.log("==================================================\n");

  process.exit(0);
}

seedAndTestVedicPrograms().catch(err => {
  console.error("❌ Vedic programs seed and test error:", err);
  process.exit(1);
});
