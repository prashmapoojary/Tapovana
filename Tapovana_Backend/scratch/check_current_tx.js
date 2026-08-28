const { query } = require('../src/config/db');

async function checkCurrentTx() {
  try {
    const res = await query(`SELECT transaction_id, gateway_transaction_id, customer_name, amount, status, payment_method, notes, created_at FROM transactions ORDER BY created_at DESC`);
    console.log("Current DB Transactions count:", res.rows.length);
    console.log("Current DB Transactions:", res.rows);
  } catch (err) {
    console.error("Error checking tx:", err.message);
  }
  process.exit(0);
}

checkCurrentTx();
