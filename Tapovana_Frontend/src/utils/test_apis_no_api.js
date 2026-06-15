const fetch = require("node:process") ? globalThis.fetch : null;

async function test() {
  const paths = [
    "https://tapoclg.onrender.com/customer",
    "https://tapoclg.onrender.com/transaction",
    "https://tapoclg.onrender.com/customers",
    "https://tapoclg.onrender.com/transactions"
  ];
  for (const url of paths) {
    try {
      console.log(`Fetching ${url}...`);
      const res = await fetch(url);
      const text = await res.text();
      console.log(`Status of ${url}:`, res.status);
      console.log(`Body (first 200 chars):`, text.slice(0, 200));
    } catch (err) {
      console.error(`Error fetching ${url}:`, err.message);
    }
  }
}

test();
