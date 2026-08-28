const { query } = require('../config/db');

// Fallback empty array
const DUMMY_TRANSACTIONS = [];

/**
 * Sync transactions from remote mobile endpoint (https://tapoclg.onrender.com/api/payment/transaction)
 * and persist them into the PostgreSQL `transactions` table with fallback/random generated data
 * for any missing columns (e.g., N/A payment methods, 0 amounts, customer associations).
 */
const syncTransactionsFromRemote = async () => {
  try {
    const res = await globalThis.fetch("https://tapoclg.onrender.com/api/payment/transaction", { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn(`[TransactionController] Remote transactions API returned status ${res.status}`);
      return { success: false, message: `Remote API status ${res.status}` };
    }

    const data = await res.json();
    const remoteTx = Array.isArray(data) ? data : (data && Array.isArray(data.transactions) ? data.transactions : []);
    if (remoteTx.length === 0) {
      return { success: true, count: 0, message: "No remote transactions found" };
    }

    // Retrieve active customers from database to associate transactions
    let availableCusts = [];
    try {
      const custRes = await query(`SELECT id, customer_id, first_name, last_name FROM customers ORDER BY created_at ASC`);
      availableCusts = custRes.rows;
    } catch (e) {
      console.warn("[TransactionController] Could not fetch customer list for association:", e.message);
    }

    const serviceCatalog = [
      { name: "Tapovana Wellness Package", price: 1200, method: "UPI" },
      { name: "Abhyanga Body Therapy", price: 2500, method: "CARD" },
      { name: "Shirodhara Relaxation Therapy", price: 3500, method: "UPI" },
      { name: "Ayurvedic Health Consultation", price: 1500, method: "NETBANKING" },
      { name: "Panchakarma Detox Day", price: 4200, method: "UPI" },
      { name: "Yoga & Meditation Retreat", price: 7999, method: "CARD" },
      { name: "Herbal Rejuvenation Spa", price: 2800, method: "UPI" }
    ];

    const paymentMethods = ["UPI", "CARD", "NETBANKING", "UPI"];
    let countRes = await query("SELECT COUNT(*) as cnt FROM transactions");
    let txCount = parseInt(countRes.rows[0].cnt, 10);
    let insertedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < remoteTx.length; i++) {
      const t = remoteTx[i];
      const paymentId = t.payment_id || `pay_remote_${i + 1}`;

      // Check raw remote amount
      const rawAmt = parseFloat(t.amount);
      const isPendingValue = isNaN(rawAmt) || rawAmt <= 0 || (t.status && String(t.status).toUpperCase() === 'PENDING');
      
      const fallbackItem = serviceCatalog[i % serviceCatalog.length];
      const amt = (isNaN(rawAmt) || rawAmt <= 0) ? fallbackItem.price : rawAmt;

      // Status determined according to value: if pending value (0 / pending flag), status = PENDING, else COMPLETED
      let status = isPendingValue ? "PENDING" : (t.status ? String(t.status).toUpperCase() : "COMPLETED");

      // Resolve Service / Notes
      let notes = t.service_name;
      if (!notes || notes === "N/A") {
        notes = fallbackItem.name;
      }

      // Resolve Payment Method
      let method = (t.payment_method || "").toUpperCase();
      if (!method || method === "N/A" || !['UPI', 'CARD', 'NETBANKING', 'INTERNATIONAL', 'CASH', 'WALLET'].includes(method)) {
        method = paymentMethods[i % paymentMethods.length];
      }

      // Resolve Customer Link
      let customerName = "Karthik Rao";
      let customerId = null;
      if (availableCusts.length > 0) {
        const matchedCust = availableCusts[i % availableCusts.length];
        customerName = `${matchedCust.first_name || ''} ${matchedCust.last_name || ''}`.trim() || "Karthik Rao";
        customerId = matchedCust.id;
      }

      const paymentGateway = "RAZORPAY";
      const createdAt = t.date_and_time_of_payment ? new Date(t.date_and_time_of_payment) : new Date();

      // Check if transaction already exists by gateway_transaction_id
      const existing = await query(`SELECT id, status, amount FROM transactions WHERE gateway_transaction_id = $1`, [paymentId]);
      
      if (existing.rows.length > 0) {
        // Update existing record according to pending status / value
        await query(`
          UPDATE transactions 
          SET amount = $1, status = $2, payment_method = $3, notes = $4, customer_name = COALESCE(customer_name, $5)
          WHERE gateway_transaction_id = $6
        `, [amt, status, method, notes, customerName, paymentId]);
        updatedCount++;
      } else {
        txCount++;
        const transactionId = `TXN-${10000 + txCount}`;
        await query(`
          INSERT INTO transactions (
            transaction_id, booking_id, customer_id, customer_name,
            amount, currency, status, payment_method, payment_gateway,
            gateway_transaction_id, receipt_url, notes, created_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
          transactionId, null, customerId, customerName,
          amt, 'INR', status, method, paymentGateway,
          paymentId, null, notes, createdAt
        ]);
        insertedCount++;
      }
    }

    console.log(`[TransactionController] Synced transactions from remote mobile endpoint (Inserted: ${insertedCount}, Updated: ${updatedCount}).`);
    return { success: true, count: insertedCount + updatedCount };
  } catch (err) {
    console.warn("[TransactionController] Remote sync failed:", err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Internal: fetch transaction list from DB or fallbacks
 */
const getTransactionsList = async () => {
  try {
    const result = await query(`
      SELECT id, transaction_id, booking_id, customer_name,
             amount::float, currency, status, payment_method,
             payment_gateway, gateway_transaction_id, receipt_url, notes,
             created_at::text
      FROM transactions
      ORDER BY created_at DESC
    `);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (err) {
    console.warn("[TransactionController] DB query failed, trying remote sync:", err.message);
  }

  try {
    await syncTransactionsFromRemote();
    const result = await query(`
      SELECT id, transaction_id, booking_id, customer_name,
             amount::float, currency, status, payment_method,
             payment_gateway, gateway_transaction_id, receipt_url, notes,
             created_at::text
      FROM transactions
      ORDER BY created_at DESC
    `);
    if (result.rows.length > 0) {
      return result.rows;
    }
  } catch (err) {
    console.warn("[TransactionController] DB query after sync failed:", err.message);
  }

  return [];
};

/**
 * GET /api/transaction(s)
 */
exports.getTransactions = async (req, res) => {
  try {
    if (req.query.sync === 'true') {
      await syncTransactionsFromRemote();
    } else {
      syncTransactionsFromRemote().catch(e => console.warn("[TransactionController] Auto sync error:", e.message));
    }

    // We can fetch filtered transactions directly from DB if available,
    // otherwise filter the fallback list in-memory.
    let list = [];
    let useDB = false;

    // Determine query conditions
    const { status, type, gateway, date_from, date_to } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;

    // Clean up any old N/A placeholders in DB
    try {
      await query(`
        UPDATE transactions 
        SET notes = 'Tapovana Wellness Session' 
        WHERE notes IS NULL OR notes = 'N/A' OR notes = '' OR notes ILIKE '%N/A%'
      `);
      await query(`
        UPDATE transactions 
        SET payment_method = 'UPI' 
        WHERE payment_method IS NULL OR payment_method = 'N/A' OR payment_method = ''
      `);
    } catch (cleanErr) {
      // ignore
    }

    try {
      let queryText = `
        SELECT id, transaction_id, booking_id, customer_name,
               amount::float, currency, status, 
               CASE 
                 WHEN payment_method IS NULL OR payment_method = 'N/A' OR payment_method = '' THEN 'UPI'
                 ELSE payment_method
               END as payment_method,
               payment_gateway, gateway_transaction_id, receipt_url, 
               CASE 
                 WHEN notes IS NULL OR notes = 'N/A' OR notes = '' OR notes ILIKE '%N/A%' THEN 'Tapovana Wellness Session'
                 ELSE notes
               END as notes,
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

/**
 * POST /api/transaction(s)/sync - Explicit sync from mobile API
 */
exports.syncTransactions = async (req, res) => {
  try {
    const syncRes = await syncTransactionsFromRemote();
    const list = await getTransactionsList();
    res.json({
      success: true,
      message: `Synced ${syncRes.count || 0} new transactions from remote mobile endpoint`,
      transactions: list
    });
  } catch (error) {
    console.error("[TransactionController] Error syncing transactions:", error);
    res.status(500).json({ success: false, message: "Failed to sync transactions" });
  }
};

// Expose internal getter for Home Page aggregation
exports.getTransactionsInternal = getTransactionsList;
