const { query } = require('../src/config/db');

async function syncFreshBookings() {
  console.log("=== FRESHLY FETCHING BOOKINGS FROM tapoclg.onrender.com ===");

  // 1. Fetch memberships map (name -> email) from memberships table
  const memRes = await query(`SELECT name, email FROM memberships WHERE name IS NOT NULL AND email IS NOT NULL`);
  const memberEmailMap = new Map();

  for (const row of memRes.rows) {
    if (row.name && row.email) {
      memberEmailMap.set(String(row.name).trim().toLowerCase(), String(row.email).trim());
    }
  }

  console.log(`Loaded ${memberEmailMap.size} name->email mappings from membership DB.`);

  // 2. Fetch remote bookings from https://tapoclg.onrender.com/api/bookings
  let remoteBookings = [];
  try {
    console.log("Fetching from https://tapoclg.onrender.com/api/bookings?limit=200 ...");
    const res = await fetch('https://tapoclg.onrender.com/api/bookings?limit=200');
    if (res.ok) {
      const data = await res.json();
      remoteBookings = data.success ? (data.bookings || []) : (Array.isArray(data) ? data : []);
      console.log(`Successfully fetched ${remoteBookings.length} bookings from tapoclg.onrender.com`);
    }
  } catch (err) {
    console.error("Fetch tapoclg error:", err.message);
  }

  if (remoteBookings.length === 0) {
    try {
      console.log("Fallback fetching from https://tapovana.onrender.com/api/bookings?limit=200 ...");
      const res = await fetch('https://tapovana.onrender.com/api/bookings?limit=200');
      if (res.ok) {
        const data = await res.json();
        remoteBookings = data.success ? (data.bookings || []) : [];
        console.log(`Fetched ${remoteBookings.length} bookings from fallback`);
      }
    } catch (err) {
      console.error("Fallback error:", err.message);
    }
  }

  // Get deleted booking IDs
  const deletedRes = await query("SELECT booking_id FROM deleted_booking_ids");
  const deletedIds = new Set(deletedRes.rows.map(r => String(r.booking_id)));

  let syncedCount = 0;
  let updatedCount = 0;

  for (const rb of remoteBookings) {
    const bId = rb.id || rb.booking_id;
    if (!bId || deletedIds.has(String(bId))) continue;

    let userName = (rb.user_name || rb.customer_name || rb.name || 'Guest Customer').trim();
    let userEmail = rb.user_email || rb.email || rb.customer_email || null;

    // Rule 1: For Prashma Poojary / Prashma salian, set email to prashmapoojary@gmail.com
    if (userName.toLowerCase().includes('prashma') || userName.toLowerCase().includes('poojary')) {
      userEmail = 'prashmapoojary@gmail.com';
    }

    // Rule 2: Match customer_name against membership table
    const lowerName = userName.toLowerCase();
    if (memberEmailMap.has(lowerName)) {
      userEmail = memberEmailMap.get(lowerName);
    }

    // Default missing fields
    if (!userEmail || userEmail === 'null' || userEmail === 'undefined') {
      const cleanName = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
      userEmail = `${cleanName || 'customer'}@gmail.com`;
    }

    let serviceName = (rb.service_name || rb.service || 'Abhyanga Ayurvedic Massage').trim();
    let bookingDate = rb.booking_date || rb.date || '2026-09-01';
    let bookingTime = rb.booking_time || rb.time || '10:00 AM';
    let totalAmount = rb.total_amount || rb.amount || '₹2,500';
    let profilePic = rb.profile_pic || rb.profile_photo || null;
    let note = rb.note || null;
    let passDetails = rb.pass_details || null;

    // All newly fetched bookings start as PENDING
    const initialStatus = 'PENDING';

    const existing = await query("SELECT id FROM bookings WHERE id = $1", [bId]);

    if (existing.rows.length === 0) {
      await query(
        `INSERT INTO bookings 
         (id, user_name, service_name, booking_date, booking_time, therapist_name, note, total_amount, pass_details, payment_status, status, created_at, user_email, profile_pic) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'PAID', $10, NOW(), $11, $12) 
         ON CONFLICT (id) DO NOTHING`,
        [
          bId, userName, serviceName,
          bookingDate, bookingTime, null,
          note, totalAmount, passDetails,
          initialStatus, userEmail, profilePic
        ]
      );
      syncedCount++;
    } else {
      // Update email, user_name, profile_pic in local database
      await query(
        `UPDATE bookings 
         SET user_email = $1, 
             user_name = $2,
             profile_pic = COALESCE(profile_pic, $3)
         WHERE id = $4`,
        [userEmail, userName, profilePic, bId]
      );
      updatedCount++;
    }
  }

  console.log(`✅ SYNC COMPLETE: ${syncedCount} new bookings inserted as PENDING, ${updatedCount} existing records updated with matching emails.`);

  // Print current bookings in DB
  const allBks = await query("SELECT id, user_name, user_email, service_name, booking_date, booking_time, status FROM bookings ORDER BY id DESC LIMIT 20");
  console.log("\n--- CURRENT BOOKINGS IN DATABASE ---");
  console.table(allBks.rows);

  process.exit(0);
}

syncFreshBookings();
