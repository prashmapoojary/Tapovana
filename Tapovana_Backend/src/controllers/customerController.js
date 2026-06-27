const { query } = require('../config/db');

// Fallback dummy data (used only if DB is unreachable)
const DUMMY_CUSTOMERS = [
  { id: "1", customer_id: "CUST-001", first_name: "Rahul", last_name: "Sharma", email: "rahul.s@example.com", phone: "+91 98765 43210", status: "ACTIVE", membership_status: "GOLD", total_bookings: 12, total_spent: 24500, join_date: "2024-01-15", last_activity: "2026-06-01", admin_notes: "Prefers evening slots" },
  { id: "2", customer_id: "CUST-002", first_name: "Priya", last_name: "Desai", email: "priya.d@example.com", phone: "+91 87654 32109", status: "ACTIVE", membership_status: "NONE", total_bookings: 2, total_spent: 3500, join_date: "2024-05-20", last_activity: "2026-05-22", admin_notes: "" },
  { id: "3", customer_id: "CUST-003", first_name: "Vikram", last_name: "Singh", email: "vikram.s@example.com", phone: "+91 76543 21098", status: "INACTIVE", membership_status: "PLATINUM", total_bookings: 45, total_spent: 89000, join_date: "2023-05-10", last_activity: "2026-04-10", admin_notes: "VIP Client. Always books premium packages." },
  { id: "4", customer_id: "CUST-004", first_name: "Anita", last_name: "Nair", email: "anita.n@example.com", phone: "+91 65432 10987", status: "ACTIVE", membership_status: "SILVER", total_bookings: 8, total_spent: 12000, join_date: "2024-02-22", last_activity: "2026-06-05", admin_notes: "Allergic to sesame oil." },
  { id: "5", customer_id: "CUST-005", first_name: "Sanjay", last_name: "Kumar", email: "sanjay.k@example.com", phone: "+91 54321 09876", status: "ARCHIVED", membership_status: "NONE", total_bookings: 1, total_spent: 1500, join_date: "2023-01-01", last_activity: "2023-01-15", admin_notes: "Duplicate account. Archived on request." },
];

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
      return result.rows;
    }
  } catch (err) {
    console.warn("[CustomerController] DB query failed, trying external API:", err.message);
  }

  // 2. Try external API as fallback
  try {
    const res = await globalThis.fetch("https://tapovana.onrender.com/api/customer");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.customers)) return data.customers;
    }
  } catch (err) {
    console.warn("[CustomerController] External API fetch failed, using fallback:", err.message);
  }

  // 3. Last resort: dummy data
  return DUMMY_CUSTOMERS;
};

/**
 * GET /api/customer(s)
 */
exports.getCustomers = async (req, res) => {
  try {
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

    res.status(201).json({ success: true, customer: result.rows[0] });
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

    const result = await query(`
      UPDATE customers SET
        first_name = COALESCE($2, first_name),
        last_name = COALESCE($3, last_name),
        email = COALESCE($4, email),
        phone = COALESCE($5, phone),
        status = COALESCE($6, status),
        membership_status = COALESCE($7, membership_status),
        admin_notes = COALESCE($8, admin_notes),
        address = COALESCE($9, address),
        city = COALESCE($10, city),
        state = COALESCE($11, state),
        pincode = COALESCE($12, pincode),
        date_of_birth = COALESCE($13, date_of_birth),
        gender = COALESCE($14, gender)
      WHERE id = $1 OR customer_id = $1
      RETURNING *
    `, [id, first_name, last_name, email, phone, status, membership_status, admin_notes, address, city, state, pincode, date_of_birth, gender]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    res.json({ success: true, customer: result.rows[0] });
  } catch (error) {
    console.error("[CustomerController] Error updating customer:", error);
    res.status(500).json({ success: false, message: "Failed to update customer" });
  }
};

/**
 * PATCH /api/customer/:id/archive - Archive a customer
 */
exports.archiveCustomer = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await query(`
      UPDATE customers SET status = 'ARCHIVED' WHERE id = $1 OR customer_id = $1 RETURNING *
    `, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "Customer not found." });
    }

    res.json({ success: true, customer: result.rows[0], message: "Customer archived." });
  } catch (error) {
    console.error("[CustomerController] Error archiving customer:", error);
    res.status(500).json({ success: false, message: "Failed to archive customer" });
  }
};

// Expose internal getter for Home Page aggregation
exports.getCustomersInternal = getCustomersList;
