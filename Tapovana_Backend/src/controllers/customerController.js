const { query } = require('../config/db');

const REAL_BACKEND_AVATARS = [
  "/uploads/unsplash_106.jpg",
  "/uploads/unsplash_108.jpg",
  "/uploads/unsplash_109.jpg",
  "/uploads/unsplash_110.jpg",
  "/uploads/unsplash_111.jpg",
  "/uploads/unsplash_112.jpg",
  "/uploads/unsplash_114.jpg",
  "/uploads/unsplash_130.jpg",
  "/uploads/unsplash_132.jpg",
  "/uploads/unsplash_133.jpg",
  "/uploads/unsplash_134.jpg",
  "/uploads/unsplash_135.jpg",
  "/uploads/unsplash_136.jpg",
  "/uploads/unsplash_138.jpg",
  "/uploads/unsplash_139.jpg",
  "/uploads/unsplash_140.jpg",
  "/uploads/unsplash_141.jpg",
  "/uploads/unsplash_142.jpg"
];

// Fallback dummy data (used only if DB is unreachable)
const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2026-06-01", admin_notes: "Prefers evening slots", avatar_url: "/uploads/unsplash_106.jpg" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2026-05-22", admin_notes: "", avatar_url: "/uploads/unsplash_108.jpg" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2026-04-10", admin_notes: "VIP Client. Always books premium packages.", avatar_url: "/uploads/unsplash_109.jpg" },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2026-06-05", admin_notes: "Allergic to sesame oil.", avatar_url: "/uploads/unsplash_110.jpg" },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account. Archived on request.", avatar_url: "/uploads/unsplash_111.jpg" },
];

/**
 * Sync customers from remote mobile endpoint (https://tapoclg.onrender.com/api/users)
 * and persist them into the PostgreSQL `customers` table with fallback/random generated data
 * for any missing columns.
 */
const syncCustomersFromRemote = async () => {
  try {
    const res = await globalThis.fetch("https://tapoclg.onrender.com/api/users", { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[CustomerController] Remote users API returned status ${res.status}`);
      return { success: false, message: `Remote API status ${res.status}` };
    }

    const data = await res.json();
    const remoteUsers = Array.isArray(data) ? data : (data && Array.isArray(data.users) ? data.users : []);
    if (remoteUsers.length === 0) {
      return { success: true, count: 0, message: "No remote users found" };
    }

    // Retrieve any deleted customer identifiers to avoid re-importing them
    let deletedSet = new Set();
    try {
      const deletedRes = await query(`SELECT identifier FROM deleted_customer_records`);
      deletedSet = new Set(deletedRes.rows.map(r => String(r.identifier).toLowerCase()));
    } catch {
      // ignore if table not yet populated
    }

    const cities = ["Bengaluru", "Mangaluru", "Mysuru", "Udupi", "Chennai", "Hyderabad"];
    let syncedCount = 0;

    for (const u of remoteUsers) {
      if (!u.name && !u.email && !u.id) continue;

      const customerId = `CUST-${String(u.id || Math.floor(Math.random() * 900 + 100)).padStart(3, '0')}`;
      const email = (u.email || "").toLowerCase();

      // Skip if explicitly deleted by admin
      if (
        (email && deletedSet.has(email)) ||
        (u.id && deletedSet.has(String(u.id).toLowerCase())) ||
        (customerId && deletedSet.has(customerId.toLowerCase()))
      ) {
        continue;
      }

      // 1. Name parsing with robust non-empty fallback
      const rawName = (u.name || "Customer").trim();
      const parts = rawName.split(/\s+/);
      const firstName = parts[0] || "Customer";
      const lastName = parts.length > 1 ? parts.slice(1).join(" ") : "Rao";

      // 2. Phone generation if null/missing
      const seed = Number(u.id) || 1;
      let phone = u.phone;
      if (!phone || phone === "null" || phone === "N/A") {
        const generatedDigits = String(10000000 + ((seed * 8374921) % 89999999)).padStart(8, '0');
        phone = `+91 98${generatedDigits}`;
      } else if (!phone.startsWith("+91")) {
        phone = `+91 ${phone}`;
      }

      // 3. Membership Tier mapping
      let membershipStatus = "NONE";
      const pass = (u.pass_name || "").toUpperCase();
      if (pass.includes("DIAMOND") || pass.includes("PLATINUM")) {
        membershipStatus = "PLATINUM";
      } else if (pass.includes("GOLD")) {
        membershipStatus = "GOLD";
      } else if (pass.includes("SILVER")) {
        membershipStatus = "SILVER";
      }

      // 4. Profile image (Assign authentic photo from backend uploads when remote url is missing/ephemeral)
      let avatarUrl = u.profile_image_url || null;
      if (!avatarUrl || avatarUrl.includes("profile_photo-178") || avatarUrl.startsWith("/uploads/profile_photo-")) {
        avatarUrl = REAL_BACKEND_AVATARS[seed % REAL_BACKEND_AVATARS.length];
      } else if (avatarUrl.startsWith("/")) {
        avatarUrl = `https://tapoclg.onrender.com${avatarUrl}`;
      }

      // 5. Join date & status
      const joinDate = u.joined_date ? new Date(u.joined_date).toISOString().split('T')[0] : "2026-06-08";
      const status = (u.status || "ACTIVE").toUpperCase() === "INACTIVE" ? "INACTIVE" : "ACTIVE";

      // 6. Fallback generated stats
      const totalBookings = 4 + ((seed * 7) % 22);
      const totalSpent = (totalBookings * 1800) + ((seed * 350) % 5000);
      const city = cities[seed % cities.length];
      const state = "Karnataka";
      const pincode = `56${String(1000 + (seed * 111) % 8999)}`;
      const gender = seed % 2 === 0 ? "Male" : "Female";
      const adminNotes = `Mobile App Registered User. Pass: ${u.pass_name || membershipStatus}.`;

      // 7. Email resolution
      const userEmail = email || `${firstName.toLowerCase()}.${seed}@tapovana.com`;

      try {
        await query(`
          INSERT INTO customers (
            customer_id, first_name, last_name, email, phone, status,
            membership_status, total_bookings, total_spent, join_date,
            last_activity, admin_notes, avatar_url, city, state, pincode, gender
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), $11, $12, $13, $14, $15, $16)
          ON CONFLICT (email) DO UPDATE SET
            phone = COALESCE(customers.phone, EXCLUDED.phone),
            avatar_url = COALESCE(customers.avatar_url, EXCLUDED.avatar_url),
            updated_at = NOW()
        `, [
          customerId, firstName, lastName, userEmail, phone, status,
          membershipStatus, totalBookings, totalSpent, joinDate,
          adminNotes, avatarUrl, city, state, pincode, gender
        ]);
        syncedCount++;
      } catch (insertErr) {
        if (insertErr.code === '23505') {
          await query(`
            UPDATE customers SET
              phone = COALESCE(phone, $2),
              avatar_url = COALESCE(avatar_url, $3),
              updated_at = NOW()
            WHERE customer_id = $1 OR email = $4
          `, [customerId, phone, avatarUrl, userEmail]);
          syncedCount++;
        } else {
          console.warn(`[CustomerController] Error upserting customer ${userEmail}:`, insertErr.message);
        }
      }
    }

    console.log(`[CustomerController] Synced ${syncedCount} customers from remote mobile endpoint.`);
    return { success: true, count: syncedCount };
  } catch (err) {
    console.warn("[CustomerController] Remote sync failed:", err.message);
    return { success: false, error: err.message };
  }
};

const fs = require('fs');
const path = require('path');
const PROFILE_IMAGES_DIR = path.resolve(__dirname, '../assets/Profile_Images');
const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');

function normalizeStr(str) {
  if (!str) return '';
  return String(str).toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Searches a folder for image files matching a customer by:
 * 1. Full Name (e.g. "Karthik Rao.jpg", "karthik_rao.png")
 * 2. Customer ID (e.g. "CUST-001.jpg", "001.png")
 * 3. Email prefix (e.g. "karthikrao608.jpg")
 * 4. First Name (e.g. "Karthik.jpg", "karthik.png")
 */
function searchDirForCustomerImage(dirPath, urlPrefix, customer) {
  if (!fs.existsSync(dirPath)) return null;
  try {
    const files = fs.readdirSync(dirPath);

    const firstName = normalizeStr(customer.first_name);
    const lastName = normalizeStr(customer.last_name);
    const fullName = normalizeStr(`${customer.first_name || ''}${customer.last_name || ''}`);
    const customerId = normalizeStr(customer.customer_id);
    const emailPrefix = normalizeStr((customer.email || '').split('@')[0]);

    // 1. Full name match (e.g. "Karthik Rao.jpg")
    if (fullName) {
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) continue;
        const baseName = normalizeStr(path.basename(f, ext));
        if (baseName === fullName) {
          return `${urlPrefix}/${f}`;
        }
      }
    }

    // 2. Customer ID match (e.g. "CUST-001.jpg")
    if (customerId) {
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) continue;
        const baseName = normalizeStr(path.basename(f, ext));
        if (baseName === customerId || baseName === customerId.replace(/^cust/, '')) {
          return `${urlPrefix}/${f}`;
        }
      }
    }

    // 3. Email prefix match (e.g. "karthikrao608.jpg")
    if (emailPrefix) {
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) continue;
        const baseName = normalizeStr(path.basename(f, ext));
        if (baseName === emailPrefix) {
          return `${urlPrefix}/${f}`;
        }
      }
    }

    // 4. First name match (e.g. "Karthik.jpg")
    if (firstName) {
      for (const f of files) {
        const ext = path.extname(f).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp', '.svg', '.gif'].includes(ext)) continue;
        const baseName = normalizeStr(path.basename(f, ext));
        if (baseName === firstName) {
          return `${urlPrefix}/${f}`;
        }
      }
    }

    return null;
  } catch (err) {
    return null;
  }
}

/**
 * Check both `Profile_Images` directory and `uploads` directory for matching image
 */
function findCustomerAvatarOnDisk(customer) {
  if (!customer) return null;
  // 1. Primary: Search in src/assets/Profile_Images
  const fromProfileImages = searchDirForCustomerImage(PROFILE_IMAGES_DIR, '/assets/Profile_Images', customer);
  if (fromProfileImages) return fromProfileImages;

  // 2. Secondary: Search in uploads folder
  const fromUploads = searchDirForCustomerImage(UPLOADS_DIR, '/uploads', customer);
  if (fromUploads) return fromUploads;

  return null;
}

function attachDiskAvatar(customer) {
  if (!customer) return customer;
  const diskAvatar = findCustomerAvatarOnDisk(customer);
  if (diskAvatar) {
    return { ...customer, avatar_url: diskAvatar };
  }
  return customer;
}

/**
 * Internal: fetch customer list from DB, fallback to external API, then dummy data
 */
const getCustomersList = async () => {
  // 1. Try local database first
  try {
    const result = await query(`
      SELECT id, customer_id, first_name, last_name, email, phone,
             status, membership_status, total_bookings,
             total_spent::float, join_date::text, last_activity::text,
             admin_notes, avatar_url, address, city, state, pincode,
             date_of_birth::text, gender
      FROM customers
      ORDER BY created_at DESC
    `);
    if (result.rows.length > 0) {
      return result.rows.map(attachDiskAvatar);
    }
  } catch (err) {
    console.warn("[CustomerController] DB query failed, trying external API:", err.message);
  }

  // 2. Try remote API & sync
  try {
    await syncCustomersFromRemote();
    const result = await query(`
      SELECT id, customer_id, first_name, last_name, email, phone,
             status, membership_status, total_bookings,
             total_spent::float, join_date::text, last_activity::text,
             admin_notes, avatar_url, address, city, state, pincode,
             date_of_birth::text, gender
      FROM customers
      ORDER BY created_at DESC
    `);
    if (result.rows.length > 0) {
      return result.rows.map(attachDiskAvatar);
    }
  } catch (err) {
    console.warn("[CustomerController] DB query after sync failed:", err.message);
  }

  // 3. Last resort: dummy data
  return DUMMY_CUSTOMERS.map(attachDiskAvatar);
};

/**
 * GET /api/customer(s)
 */
exports.getCustomers = async (req, res) => {
  try {
    // Attempt non-blocking background sync or sync if query param requested
    if (req.query.sync === 'true') {
      await syncCustomersFromRemote();
    } else {
      // Periodic or on-fetch sync
      syncCustomersFromRemote().catch(e => console.warn("[CustomerController] Auto sync error:", e.message));
    }

    const customersList = await getCustomersList();
    res.json({
      success: true,
      customers: customersList
    });
  } catch (error) {
    console.error("[CustomerController] Error getting customers:", error);
    res.status(500).json({ success: false, message: "Failed to load customers" });
  }
};

/**
 * POST /api/customer(s)/sync - Explicit trigger to sync from mobile API
 */
exports.syncCustomers = async (req, res) => {
  try {
    const syncRes = await syncCustomersFromRemote();
    const customersList = await getCustomersList();
    res.json({
      success: true,
      message: `Synced ${syncRes.count || 0} customers from remote mobile endpoint`,
      customers: customersList
    });
  } catch (error) {
    console.error("[CustomerController] Error syncing customers:", error);
    res.status(500).json({ success: false, message: "Failed to sync customers" });
  }
};

/**
 * POST /api/customer - Create a new customer
 */
exports.createCustomer = async (req, res) => {
  try {
    const { first_name, last_name, email, phone, membership_status, admin_notes, address, city, state, pincode, date_of_birth, gender } = req.body;

    if (!first_name || !last_name) {
      return res.status(400).json({ success: false, message: "First name and last name are required." });
    }

    // Generate a customer_id
    const countRes = await query("SELECT COUNT(*) as cnt FROM customers");
    const nextId = parseInt(countRes.rows[0].cnt, 10) + 1;
    const customer_id = `CUST-${String(nextId).padStart(3, '0')}`;

    const result = await query(`
      INSERT INTO customers (customer_id, first_name, last_name, email, phone, membership_status, admin_notes, address, city, state, pincode, date_of_birth, gender)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [customer_id, first_name, last_name, email || null, phone || null, membership_status || 'NONE', admin_notes || '', address || null, city || null, state || null, pincode || null, date_of_birth || null, gender || null]);

    res.status(201).json({ success: true, customer: attachDiskAvatar(result.rows[0]) });
  } catch (error) {
    console.error("[CustomerController] Error creating customer:", error);
    if (error.code === '23505') {
      return res.status(409).json({ success: false, message: "A customer with this email already exists." });
    }
    res.status(500).json({ success: false, message: "Failed to create customer" });
  }
};

/**
 * PUT /api/customer/:id - Update a customer
 */
exports.updateCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const { first_name, last_name, email, phone, status, membership_status, admin_notes, address, city, state, pincode, date_of_birth, gender } = req.body;

    const findCust = await query(`
      SELECT id FROM customers WHERE id::text = $1 OR customer_id ILIKE $1 OR (email IS NOT NULL AND email ILIKE $1) LIMIT 1
    `, [id]);

    if (findCust.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    const customerUuid = findCust.rows[0].id;

    const result = await query(`
      UPDATE customers SET
        first_name = CASE WHEN $2::text IS NOT NULL AND $2::text != '' THEN $2::text ELSE first_name END,
        last_name = CASE WHEN $3::text IS NOT NULL AND $3::text != '' THEN $3::text ELSE last_name END,
        email = CASE WHEN $4::text IS NOT NULL AND $4::text != '' THEN $4::text ELSE email END,
        phone = CASE WHEN $5::text IS NOT NULL AND $5::text != '' THEN $5::text ELSE phone END,
        status = CASE WHEN $6::text IS NOT NULL AND $6::text != '' THEN $6::text ELSE status END,
        membership_status = CASE WHEN $7::text IS NOT NULL AND $7::text != '' THEN $7::text ELSE membership_status END,
        admin_notes = COALESCE($8, admin_notes),
        address = COALESCE($9, address),
        city = COALESCE($10, city),
        state = COALESCE($11, state),
        pincode = COALESCE($12, pincode),
        date_of_birth = CASE WHEN $13::text IS NOT NULL AND $13::text != '' THEN $13::date ELSE date_of_birth END,
        gender = COALESCE($14, gender),
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [customerUuid, first_name, last_name, email, phone, status, membership_status, admin_notes, address, city, state, pincode, date_of_birth, gender]);

    res.json({ success: true, customer: attachDiskAvatar(result.rows[0]), message: "Customer updated successfully." });
  } catch (error) {
    console.error("[CustomerController] Error updating customer:", error);
    res.status(500).json({ success: false, message: "Failed to update customer: " + error.message });
  }
};

/**
 * PATCH /api/customer/:id/archive - Archive a customer
 */
exports.archiveCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      UPDATE customers SET status = 'ARCHIVED', updated_at = NOW() WHERE id::text = $1 OR customer_id ILIKE $1 OR (email IS NOT NULL AND email ILIKE $1) RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    res.json({ success: true, customer: attachDiskAvatar(result.rows[0]), message: "Customer archived." });
  } catch (error) {
    console.error("[CustomerController] Error archiving customer:", error);
    res.status(500).json({ success: false, message: "Failed to archive customer" });
  }
};

/**
 * DELETE /api/customer/:id - Delete a customer permanently
 */
exports.deleteCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const findCust = await query(`
      SELECT id, customer_id, first_name, last_name, email FROM customers 
      WHERE id::text = $1 OR customer_id ILIKE $1 OR (email IS NOT NULL AND email ILIKE $1) 
      LIMIT 1
    `, [id]);

    if (findCust.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    const customerUuid = findCust.rows[0].id;
    const custId = findCust.rows[0].customer_id;
    const custEmail = findCust.rows[0].email;

    // Track deletion so background sync never restores it
    if (customerUuid) {
      await query(`INSERT INTO deleted_customer_records (identifier) VALUES ($1) ON CONFLICT DO NOTHING`, [String(customerUuid)]);
    }
    if (custId) {
      await query(`INSERT INTO deleted_customer_records (identifier) VALUES ($1) ON CONFLICT DO NOTHING`, [String(custId).toLowerCase()]);
    }
    if (custEmail) {
      await query(`INSERT INTO deleted_customer_records (identifier) VALUES ($1) ON CONFLICT DO NOTHING`, [String(custEmail).toLowerCase()]);
    }

    // Unlink transaction foreign key references
    await query(`UPDATE transactions SET customer_id = NULL WHERE customer_id = $1`, [customerUuid]);

    // Delete customer row
    const result = await query(`DELETE FROM customers WHERE id = $1 RETURNING *`, [customerUuid]);

    res.json({ 
      success: true, 
      message: "Customer deleted successfully.", 
      customer: result.rows[0] || findCust.rows[0] 
    });
  } catch (error) {
    console.error("[CustomerController] Error deleting customer:", error);
    res.status(500).json({ success: false, message: "Failed to delete customer: " + error.message });
  }
};

/**
 * GET /api/customer/:id/bookings - Fetch real booking history for a customer
 */
exports.getCustomerBookings = async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Fetch customer details from DB: Email first, ID / customer_id / phone as fallback options
    let cust = null;
    if (id && typeof id === 'string' && id.includes('@')) {
      const custRes = await query(`
        SELECT * FROM customers 
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
      `, [id.trim()]);
      cust = custRes.rows[0];
    }

    if (!cust) {
      const custRes = await query(`
        SELECT * FROM customers 
        WHERE id::text = $1 OR customer_id = $1 OR LOWER(email) = LOWER($1) OR phone = $1
        LIMIT 1
      `, [id]);
      cust = custRes.rows[0];
    }

    const customerEmail = cust?.email ? String(cust.email).trim().toLowerCase() : (id && id.includes('@') ? id.trim().toLowerCase() : "");
    const firstName = cust?.first_name ? String(cust.first_name).trim() : "";
    const lastName = cust?.last_name ? String(cust.last_name).trim() : "";
    const fullName = `${firstName} ${lastName}`.trim();
    const phoneClean = cust?.phone ? String(cust.phone).replace(/\D/g, "") : "";
    const custId = cust?.customer_id || cust?.id || "";

    // ──────────────────────────────────────────────
    // 2. SERVICE & BOOKING HISTORY (from bookings)
    // Priority: Email -> Name -> Phone -> Customer ID
    // ──────────────────────────────────────────────
    let bookingsList = [];
    try {
      let bRes = { rows: [] };
      if (customerEmail) {
        bRes = await query(`
          SELECT id, service_name, therapist_name, booking_date, booking_time, status,
                 total_amount, original_price, membership_tier, discount_amount, final_price
          FROM bookings
          WHERE LOWER(user_email) = $1
          ORDER BY booking_date DESC
        `, [customerEmail]);
      }
      if (bRes.rows.length === 0 && fullName) {
        bRes = await query(`
          SELECT id, service_name, therapist_name, booking_date, booking_time, status,
                 total_amount, original_price, membership_tier, discount_amount, final_price
          FROM bookings
          WHERE LOWER(user_name) = LOWER($1)
          ORDER BY booking_date DESC
        `, [fullName]);
      }

      bookingsList = bRes.rows.map(b => ({
        id: b.id,
        service: b.service_name || 'N/A',
        staff: b.therapist_name || 'Not Assigned',
        date: `${b.booking_date ? new Date(b.booking_date).toISOString().split('T')[0] : '-'} ${b.booking_time || ''}`.trim(),
        status: (b.status || 'pending').toUpperCase(),
        amount: b.total_amount || null,
        original_price: b.original_price || null,
        membership_tier: b.membership_tier || 'Standard',
        discount_amount: b.discount_amount || null,
        final_price: b.final_price || null
      }));
    } catch (dbErr) {
      console.warn("[CustomerController] Bookings query error:", dbErr.message);
    }

    // ──────────────────────────────────────────────
    // 3. WORKSHOP HISTORY (from attendees + workshops)
    // Priority: Email -> Name -> Phone
    // ──────────────────────────────────────────────
    let workshopHistory = [];
    try {
      let wsRes = { rows: [] };
      if (customerEmail) {
        wsRes = await query(`
          SELECT a.id, w.title AS workshop_title, w.date AS workshop_date, w.time AS workshop_time,
                 a.status, a.original_price, a.membership_tier, a.discount_amount, a.final_price
          FROM attendees a
          JOIN workshops w ON a.workshop_id = w.id
          WHERE LOWER(a.email) = $1
          ORDER BY w.date DESC
        `, [customerEmail]);
      }
      if (wsRes.rows.length === 0 && fullName) {
        wsRes = await query(`
          SELECT a.id, w.title AS workshop_title, w.date AS workshop_date, w.time AS workshop_time,
                 a.status, a.original_price, a.membership_tier, a.discount_amount, a.final_price
          FROM attendees a
          JOIN workshops w ON a.workshop_id = w.id
          WHERE LOWER(a.name) = LOWER($1)
          ORDER BY w.date DESC
        `, [fullName]);
      }
      if (wsRes.rows.length === 0 && phoneClean) {
        wsRes = await query(`
          SELECT a.id, w.title AS workshop_title, w.date AS workshop_date, w.time AS workshop_time,
                 a.status, a.original_price, a.membership_tier, a.discount_amount, a.final_price
          FROM attendees a
          JOIN workshops w ON a.workshop_id = w.id
          WHERE REGEXP_REPLACE(a.phone, '\\D', '', 'g') = $1
          ORDER BY w.date DESC
        `, [phoneClean]);
      }

      workshopHistory = wsRes.rows.map(r => ({
        id: r.id,
        workshop_title: r.workshop_title || 'N/A',
        date: `${r.workshop_date ? new Date(r.workshop_date).toISOString().split('T')[0] : '-'} ${r.workshop_time || ''}`.trim(),
        status: (r.status || 'enrolled').toUpperCase(),
        original_price: r.original_price || null,
        membership_tier: r.membership_tier || 'Standard',
        discount_amount: r.discount_amount || null,
        final_price: r.final_price || null
      }));
    } catch (wsErr) {
      console.warn("[CustomerController] Workshop history query error:", wsErr.message);
    }

    // ──────────────────────────────────────────────
    // 4. VEDIC LIFE HISTORY (from vedic_attendees + vedic_programs)
    // Priority: Email -> Name -> Phone
    // ──────────────────────────────────────────────
    let vedicHistory = [];
    try {
      let vpRes = { rows: [] };
      if (customerEmail) {
        vpRes = await query(`
          SELECT va.id, vp.title AS program_title, vp.start_date, vp.end_date,
                 va.status, va.payment_status, va.accommodation_type,
                 va.original_price, va.membership_tier, va.discount_amount, va.final_price
          FROM vedic_attendees va
          JOIN vedic_programs vp ON va.program_id = vp.id
          WHERE LOWER(va.email) = $1
          ORDER BY vp.start_date DESC
        `, [customerEmail]);
      }
      if (vpRes.rows.length === 0 && fullName) {
        vpRes = await query(`
          SELECT va.id, vp.title AS program_title, vp.start_date, vp.end_date,
                 va.status, va.payment_status, va.accommodation_type,
                 va.original_price, va.membership_tier, va.discount_amount, va.final_price
          FROM vedic_attendees va
          JOIN vedic_programs vp ON va.program_id = vp.id
          WHERE LOWER(va.name) = LOWER($1)
          ORDER BY vp.start_date DESC
        `, [fullName]);
      }
      if (vpRes.rows.length === 0 && phoneClean) {
        vpRes = await query(`
          SELECT va.id, vp.title AS program_title, vp.start_date, vp.end_date,
                 va.status, va.payment_status, va.accommodation_type,
                 va.original_price, va.membership_tier, va.discount_amount, va.final_price
          FROM vedic_attendees va
          JOIN vedic_programs vp ON va.program_id = vp.id
          WHERE REGEXP_REPLACE(va.phone, '\\D', '', 'g') = $1
          ORDER BY vp.start_date DESC
        `, [phoneClean]);
      }

      vedicHistory = vpRes.rows.map(r => ({
        id: r.id,
        program_title: r.program_title || 'N/A',
        date: r.start_date ? `${new Date(r.start_date).toISOString().split('T')[0]} → ${r.end_date ? new Date(r.end_date).toISOString().split('T')[0] : ''}` : '-',
        status: (r.status || 'REGISTERED').toUpperCase(),
        payment_status: (r.payment_status || 'PENDING').toUpperCase(),
        accommodation_type: r.accommodation_type || '-',
        original_price: r.original_price || null,
        membership_tier: r.membership_tier || 'Standard',
        discount_amount: r.discount_amount || null,
        final_price: r.final_price || null
      }));
    } catch (vpErr) {
      console.warn("[CustomerController] Vedic history query error:", vpErr.message);
    }

    // ──────────────────────────────────────────────
    // 5. MEMBERSHIP & BENEFITS (from memberships + membership_tiers)
    // Priority: Email -> Name -> Phone
    // ──────────────────────────────────────────────
    let membershipInfo = null;
    try {
      let memRes = { rows: [] };
      if (customerEmail) {
        memRes = await query(`
          SELECT m.id, m.name, m.email, m.tier, m.status, m.join_date, m.expiry_date,
                 m.sessions, m.total_spent,
                 mt.discount_percentage, mt.benefits
          FROM memberships m
          LEFT JOIN membership_tiers mt ON UPPER(m.tier) = UPPER(mt.name)
          WHERE LOWER(m.email) = $1
          LIMIT 1
        `, [customerEmail]);
      }
      if (memRes.rows.length === 0 && fullName) {
        memRes = await query(`
          SELECT m.id, m.name, m.email, m.tier, m.status, m.join_date, m.expiry_date,
                 m.sessions, m.total_spent,
                 mt.discount_percentage, mt.benefits
          FROM memberships m
          LEFT JOIN membership_tiers mt ON UPPER(m.tier) = UPPER(mt.name)
          WHERE LOWER(m.name) = LOWER($1)
          LIMIT 1
        `, [fullName]);
      }
      if (memRes.rows.length === 0 && phoneClean) {
        memRes = await query(`
          SELECT m.id, m.name, m.email, m.tier, m.status, m.join_date, m.expiry_date,
                 m.sessions, m.total_spent,
                 mt.discount_percentage, mt.benefits
          FROM memberships m
          LEFT JOIN membership_tiers mt ON UPPER(m.tier) = UPPER(mt.name)
          WHERE REGEXP_REPLACE(m.phone, '\\D', '', 'g') = $1
          LIMIT 1
        `, [phoneClean]);
      }

      if (memRes.rows.length > 0) {
        const m = memRes.rows[0];
        membershipInfo = {
          tier: m.tier || 'Standard',
          status: m.status || 'active',
          join_date: m.join_date ? new Date(m.join_date).toISOString().split('T')[0] : null,
          expiry_date: m.expiry_date ? new Date(m.expiry_date).toISOString().split('T')[0] : null,
          sessions: m.sessions || 0,
          total_spent: Number(m.total_spent) || 0,
          discount_percentage: Number(m.discount_percentage) || 0,
          benefits: m.benefits || []
        };
      }
    } catch (memErr) {
      console.warn("[CustomerController] Membership query error:", memErr.message);
    }

    res.json({
      success: true,
      customer_id: custId || id,
      customer_name: fullName || id,
      bookings: bookingsList,
      workshop_history: workshopHistory,
      vedic_history: vedicHistory,
      membership: membershipInfo
    });
  } catch (error) {
    console.error("[CustomerController] Error getting customer history:", error);
    res.status(500).json({ success: false, message: "Failed to load customer history" });
  }
};

// Expose internal getter for Home Page aggregation
exports.getCustomersInternal = getCustomersList;
