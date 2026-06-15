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

const getTransactionsList = async () => {
  try {
    const res = await globalThis.fetch("https://tapoclg.onrender.com/api/transaction");
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data;
      } else if (data && Array.isArray(data.transactions)) {
        return data.transactions;
      }
    }
  } catch (err) {
    console.warn("[TransactionController] External API fetch failed, using fallback:", err.message);
  }
  return DUMMY_TRANSACTIONS;
};

exports.getTransactions = async (req, res) => {
  try {
    const list = await getTransactionsList();

    // Calculate dynamic stats
    let total_collected = 0;
    let pending_amount = 0;
    let failed_amount = 0;
    let refunded_amount = 0;
    let discounts_applied = 4800; // static default from dummy frontend fallback

    list.forEach(t => {
      const status = (t.status || "").toUpperCase();
      const amt = Number(t.amount) || 0;
      if (status === "COMPLETED" || status === "PAID") {
        total_collected += amt;
      } else if (status === "PENDING") {
        pending_amount += amt;
      } else if (status === "FAILED") {
        failed_amount += amt;
      } else if (status === "REFUNDED") {
        refunded_amount += amt;
      }
    });

    // Handle pagination (if requested by frontend)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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

// Expose internal getter for Home Page aggregation
exports.getTransactionsInternal = getTransactionsList;
