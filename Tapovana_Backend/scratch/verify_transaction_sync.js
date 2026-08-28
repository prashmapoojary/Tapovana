const { query } = require('../src/config/db');
const transactionController = require('../src/controllers/transactionController');

async function verifyTransactionSync() {
  console.log("🌟 --- STARTING REMOTE TRANSACTION SYNC VERIFICATION --- 🌟\n");

  // 1. Trigger remote sync
  console.log("1️⃣ Triggering Sync from https://tapoclg.onrender.com/api/payment/transaction ...");
  const req = { query: { sync: 'true' } };
  const res = {
    statusCode: 200,
    data: null,
    status: function(code) { this.statusCode = code; return this; },
    json: function(data) { this.data = data; return this; }
  };

  await transactionController.getTransactions(req, res);
  if (!res.data || !res.data.success) {
    throw new Error(`Sync failed: ${res.data?.message}`);
  }

  console.log(`   ✅ API Response returned ${res.data.transactions.length} total transactions.`);

  // 2. Query DB to verify remote transactions exist in PostgreSQL
  console.log("\n2️⃣ Querying PostgreSQL database transactions table ...");
  const dbRes = await query(`
    SELECT transaction_id, gateway_transaction_id, customer_name, amount::float, status, payment_method, notes, created_at 
    FROM transactions 
    WHERE gateway_transaction_id LIKE 'pay_%' 
    ORDER BY created_at DESC
  `);

  console.log(`   Total remote transactions in DB: ${dbRes.rows.length}`);
  dbRes.rows.forEach(t => {
    console.log(`   📌 Txn: ${t.transaction_id} | Gateway: ${t.gateway_transaction_id} | Cust: ${t.customer_name} | Amt: ₹${t.amount} | Status: ${t.status} | Notes: ${t.notes}`);
  });

  const remotePay1 = dbRes.rows.find(r => r.gateway_transaction_id === 'pay_TU4lRQAyPKhhLl');
  if (!remotePay1) {
    throw new Error("pay_TU4lRQAyPKhhLl not found in database!");
  }

  if (remotePay1.status !== 'PENDING') {
    throw new Error(`Expected pay_TU4lRQAyPKhhLl to have status 'PENDING', got '${remotePay1.status}'`);
  }
  console.log(`\n   ✅ Pending transaction pay_TU4lRQAyPKhhLl fed into DB with status PENDING and value ₹${remotePay1.amount}`);

  console.log("\n==================================================");
  console.log("🎉 REMOTE TRANSACTION SYNC VERIFIED 100%!");
  console.log("==================================================\n");

  process.exit(0);
}

verifyTransactionSync().catch(err => {
  console.error("❌ Verification error:", err);
  process.exit(1);
});
