const fetch = require("node:process") ? globalThis.fetch : null;

async function test() {
  const paths = [
    "https://tapovana.onrender.com/customer",
    "https://tapovana.onrender.com/transaction",
    "https://tapovana.onrender.com/customers",
    "https://tapovana.onrender.com/transactions"
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
