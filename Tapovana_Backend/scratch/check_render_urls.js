async function testRenderUrls() {
  console.log("=== TESTING RENDER URL STATUS ===");

  const urls = [
    'https://tapovana.onrender.com/api/services',
    'https://tapovana.onrender.com/api/bookings',
    'https://tapoclg.onrender.com/api/services',
    'https://tapoclg.onrender.com/api/bookings'
  ];

  for (const u of urls) {
    try {
      const res = await fetch(u);
      const text = await res.text();
      console.log(`\nURL: ${u}`);
      console.log(`STATUS: ${res.status}`);
      console.log(`RESPONSE PREVIEW: ${text.slice(0, 150)}`);
    } catch (e) {
      console.error(`URL: ${u} ERROR:`, e.message);
    }
  }

  process.exit(0);
}

testRenderUrls();
