async function testRemoteFetch() {
  try {
    const res = await fetch("https://tapoclg.onrender.com/api/payment/transaction");
    console.log("Status:", res.status);
    const text = await res.text();
    console.log("Raw Response length:", text.length);
    console.log("Raw Response preview:", text.substring(0, 1000));
    try {
      const json = JSON.parse(text);
      console.log("Parsed JSON:", JSON.stringify(json, null, 2).substring(0, 2000));
    } catch (e) {
      console.error("JSON parse error:", e.message);
    }
  } catch (err) {
    console.error("Fetch error:", err.message);
  }
}

testRemoteFetch();
