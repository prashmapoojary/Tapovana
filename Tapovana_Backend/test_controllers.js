const customerController = require("./src/controllers/customerController");
const transactionController = require("./src/controllers/transactionController");
const homeController = require("./src/controllers/homeController");

// Helper to construct mock Express req and res
const makeMockRes = (resolve) => {
  return {
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.body = data;
      resolve(this);
    }
  };
};

async function runTests() {
  console.log("=== Running Backend Controller Unit Tests ===");

  // 1. Test Customer Controller
  console.log("\n--- Testing Customer Controller ---");
  const custRes = await new Promise(resolve => {
    customerController.getCustomers({}, makeMockRes(resolve));
  });
  console.log("Status Code:", custRes.statusCode || 200);
  console.log("Success:", custRes.body.success);
  console.log("Number of Customers:", custRes.body.customers?.length);
  if (custRes.body.customers && custRes.body.customers.length > 0) {
    console.log("First Customer ID:", custRes.body.customers[0].customer_id);
    console.log("First Customer TIER:", custRes.body.customers[0].membership_status);
  }

  // 2. Test Transaction Controller
  console.log("\n--- Testing Transaction Controller ---");
  const txnRes = await new Promise(resolve => {
    transactionController.getTransactions({ query: { page: 1, limit: 10 } }, makeMockRes(resolve));
  });
  console.log("Status Code:", txnRes.statusCode || 200);
  console.log("Success:", txnRes.body.success);
  console.log("Number of Transactions:", txnRes.body.transactions?.length);
  console.log("Ledger Summary:", JSON.stringify(txnRes.body.summary, null, 2));
  console.log("Pagination Info:", JSON.stringify(txnRes.body.pagination, null, 2));

  // 3. Test Home Controller
  console.log("\n--- Testing Home Controller ---");
  const homeRes = await new Promise(resolve => {
    homeController.getHomeSummary({}, makeMockRes(resolve));
  });
  console.log("Status Code:", homeRes.statusCode || 200);
  console.log("Success:", homeRes.body.success);
  console.log("Home Summary Metrics:", JSON.stringify(homeRes.body.summary, null, 2));

  console.log("\n=== Unit Tests Finished successfully ===");
  process.exit(0);
}

runTests();
