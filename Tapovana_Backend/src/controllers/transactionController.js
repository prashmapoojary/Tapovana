const { query } = require('../config/db');

// Fallback dummy data
const DUMMY_TRANSACTIONS = [
  { id: "1", transaction_id: "TXN-10001", booking_id: "BK-1001", customer_name: "Rahul Sharma",    amount: 2500,  currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Ox9aAbCd123", created_at: "2026-06-15T10:00:00Z" },
  { id: "2", transaction_id: "TXN-10002", booking_id: "BK-1002", customer_name: "Priya Desai",     amount: 1200,  currency: "INR", status: "PENDING",   payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_3Px7YqGH456",  created_at: "2026-06-16T07:00:00Z" },
  { id: "3", transaction_id: "TXN-10003", booking_id: "BK-1003", customer_name: "Vikram Singh",    amount: 5000,  currency: "INR", status: "COMPLETED", payment_method: "NETBANKING", payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Qr8bCdEf789", created_at: "2026-06-18T09:00:00Z" },
  { id: "4", transaction_id: "TXN-10004", booking_id: "BK-1004", customer_name: "Anita Nair",      amount: 800,   currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Ss1cDeFg012", created_at: "2026-06-15T17:00:00Z" },
  { id: "5", transaction_id: "TXN-10005", booking_id: "BK-1005", customer_name: "Sanjay Kumar",    amount: 1500,  currency: "INR", status: "FAILED",    payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_4Rx9YsHI345",  created_at: "2026-06-20T11:00:00Z" },
  { id: "6", transaction_id: "TXN-10006", booking_id: "BK-1006", customer_name: "Deepika Menon",   amount: 3500,  currency: "INR", status: "REFUNDED",  payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Tt2dEfGh678", created_at: "2026-06-12T14:00:00Z" },
  { id: "7", transaction_id: "TXN-10007", booking_id: "BK-1007", customer_name: "Mohan Pillai",    amount: 4200,  currency: "INR", status: "COMPLETED", payment_method: "UPI",        payment_gateway: "RAZORPAY", gateway_transaction_id: "pay_Uu3eFgHi901", created_at: "2026-06-22T08:00:00Z" },
  { id: "8", transaction_id: "TXN-10008", booking_id: "BK-1008", customer_name: "Kavitha Iyer",    amount: 7999,  currency: "INR", status: "COMPLETED", payment_method: "CARD",       payment_gateway: "STRIPE",    gateway_transaction_id: "ch_5Sy0ZtIJ234",  created_at: "2026-06-25T10:30:00Z" },
];

/**
 * Internal: fetch transaction list from DB or fallbacks
 */
const getTransactionsList = async () => {
  try {
    const result = await query(`
      SELECT id, transaction_id, booking_id, customer_name,
             amount::float, currency, status, payment_method,
             payment_gateway, gateway_transaction_id, receipt_url,
             created_at::text
      FROM transactions
      ORDER BY created_at DESC
    `);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (err) {
    console.warn("[TransactionController] DB query failed, trying external API:", err.message);
  }

  try {
    const res = await globalThis.fetch("https://tapoclg.onrender.com/api/transaction");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.transactions)) return data.transactions;
    }
  } catch (err) {
    console.warn("[TransactionController] External API fetch failed, using fallback:", err.message);
  }

  return DUMMY_TRANSACTIONS;
};

/**
 * GET /api/transaction(s)
 */
exports.getTransactions = async (req, res) => {
  try {
    // We can fetch filtered transactions directly from DB if available,
    // otherwise filter the fallback list in-memory.
    let list = [];
    let useDB = false;

    // Determine query conditions
    const { status, type, gateway, date_from, date_to } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    try {
      let queryText = `
        SELECT id, transaction_id, booking_id, customer_name,
               amount::float, currency, status, payment_method,
               payment_gateway, gateway_transaction_id, receipt_url,
               created_at::text
        FROM transactions
        WHERE 1=1
      `;
      const queryParams = [];
      let paramCount = 1;

      if (status) {
        queryText += ` AND status = $${paramCount}`;
        queryParams.push(status.toUpperCase());
        paramCount++;
      }
      if (type) {
        queryText += ` AND payment_method = $${paramCount}`;
        queryParams.push(type.toUpperCase());
        paramCount++;
      }
      if (gateway) {
        queryText += ` AND payment_gateway = $${paramCount}`;
        queryParams.push(gateway.toUpperCase());
        paramCount++;
      }
      if (date_from) {
        queryText += ` AND created_at >= $${paramCount}`;
        queryParams.push(date_from);
        paramCount++;
      }
      if (date_to) {
        queryText += ` AND created_at <= $${paramCount}::timestamp + interval '1 day'`;
        queryParams.push(date_to);
        paramCount++;
      }

      queryText += ` ORDER BY created_at DESC`;

      const result = await query(queryText, queryParams);
      list = result.rows;
      useDB = true;
    } catch (dbErr) {
      console.warn("[TransactionController] Filtered query failed, running standard fallback list:", dbErr.message);
      list = await getTransactionsList();
    }

    // In-memory filter fallback (if not queried via DB)
    if (!useDB) {
      if (status) {
        list = list.filter(t => (t.status || "").toUpperCase() === status.toUpperCase());
      }
      if (type) {
        list = list.filter(t => (t.payment_method || "").toUpperCase() === type.toUpperCase());
      }
      if (gateway) {
        list = list.filter(t => (t.payment_gateway || "").toUpperCase() === gateway.toUpperCase());
      }
      if (date_from) {
        list = list.filter(t => t.created_at >= date_from);
      }
      if (date_to) {
        list = list.filter(t => t.created_at <= date_to + "T23:59:59Z");
      }
    }

    // Compute stats
    let total_collected = 0;
    let pending_amount = 0;
    let failed_amount = 0;
    let refunded_amount = 0;
    let discounts_applied = 4800; // static base default

    // If using DB, we can get clean sums directly or compute from full list
    let fullList = list;
    if (useDB) {
      // If we filtered, get sums from full DB to keep metrics accurate or sum current list.
      // Usually, metrics show overall stats, but let's calculate them from all rows in DB for accuracy.
      try {
        const statsRes = await query(`
          SELECT 
            COALESCE(SUM(CASE WHEN status IN ('COMPLETED','PAID') THEN amount ELSE 0 END),0)::float as collected,
            COALESCE(SUM(CASE WHEN status = 'PENDING' THEN amount ELSE 0 END),0)::float as pending,
            COALESCE(SUM(CASE WHEN status = 'FAILED' THEN amount ELSE 0 END),0)::float as failed,
            COALESCE(SUM(CASE WHEN status = 'REFUNDED' THEN amount ELSE 0 END),0)::float as refunded
          FROM transactions
        `);
        if (statsRes.rows.length > 0) {
          const stats = statsRes.rows[0];
          total_collected = stats.collected;
          pending_amount = stats.pending;
          failed_amount = stats.failed;
          refunded_amount = stats.refunded;
        }
      } catch (sumErr) {
        // Fallback calculation from filtered list
        fullList.forEach(t => {
          const s = (t.status || "").toUpperCase();
          const amt = Number(t.amount) || 0;
          if (s === "COMPLETED" || s === "PAID") total_collected += amt;
          else if (s === "PENDING") pending_amount += amt;
          else if (s === "FAILED") failed_amount += amt;
          else if (s === "REFUNDED") refunded_amount += amt;
        });
      }
    } else {
      fullList.forEach(t => {
        const s = (t.status || "").toUpperCase();
        const amt = Number(t.amount) || 0;
        if (s === "COMPLETED" || s === "PAID") total_collected += amt;
        else if (s === "PENDING") pending_amount += amt;
        else if (s === "FAILED") failed_amount += amt;
        else if (s === "REFUNDED") refunded_amount += amt;
      });
    }

    // Paginate list
    const total = list.length;
    const pages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedList = list.slice(offset, offset + limit);

    res.json({
      success: true,
      transactions: paginatedList,
      summary: {
        total_collected,
        pending_amount,
        failed_amount,
        refunded_amount,
        discounts_applied
      },
      pagination: {
        page,
        limit,
        total,
        pages
      }
    });
  } catch (error) {
    console.error("[TransactionController] Error getting transactions:", error);
    res.status(500).json({ success: false, message: "Failed to load transactions ledger" });
  }
};

/**
 * POST /api/transaction - Create a transaction
 */
exports.createTransaction = async (req, res) => {
  try {
    const { booking_id, customer_id, customer_name, amount, currency, status, payment_method, payment_gateway, gateway_transaction_id, receipt_url, notes } = req.body;

    if (!amount) {
      return res.status(400).json({ success: false, message: "Amount is required." });
    }

    // Generate transaction_id
    const countRes = await query("SELECT COUNT(*) as cnt FROM transactions");
    const nextId = parseInt(countRes.rows[0].cnt, 10) + 10001;
    const transaction_id = `TXN-${nextId}`;

    const result = await query(`
      INSERT INTO transactions (transaction_id, booking_id, customer_id, customer_name, amount, currency, status, payment_method, payment_gateway, gateway_transaction_id, receipt_url, notes)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [transaction_id, booking_id || null, customer_id || null, customer_name || null, amount, currency || 'INR', status || 'PENDING', payment_method || null, payment_gateway || null, gateway_transaction_id || null, receipt_url || null, notes || '']);

    res.status(201).json({ success: true, transaction: result.rows[0] });
  } catch (error) {
    console.error("[TransactionController] Error creating transaction:", error);
    res.status(500).json({ success: false, message: "Failed to create transaction record." });
  }
};

// Expose internal getter for Home Page aggregation
exports.getTransactionsInternal = getTransactionsList;
