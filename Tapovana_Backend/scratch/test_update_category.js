const { query } = require('../src/config/db');

async function testUpdateCategory() {
  console.log("🌟 --- TESTING WORKSHOP UPDATE CATEGORY --- 🌟\n");

  const getRes = await query("SELECT id, title, category FROM workshops LIMIT 1");
  if (!getRes.rows.length) {
    console.log("No workshops found to test!");
    process.exit(0);
  }

  const ws = getRes.rows[0];
  console.log(`Initial Workshop: "${ws.title}" [ID: ${ws.id}] Category: "${ws.category}"`);

  // Call updateWorkshop logic simulation
  const catInput = "Yoga ";
  const allowedCategories = [
    'Yoga', 'Meditation', 'Nutrition', 'Ayurveda', 'Holistic',
    'Yoga & Meditation', 'Nutrition & Diet', 'Hatha Yoga', 'Mind & Meditation',
    'Detox & Healing', 'Spiritual & Yoga', 'Longevity & Rejuvenation', 'Digestive & Immunity',
    'Wellness', 'Spa'
  ];

  let resolvedCat = catInput;
  if (resolvedCat !== undefined && resolvedCat !== null && String(resolvedCat).trim() !== '') {
    const catStr = String(resolvedCat).trim();
    const matched = allowedCategories.find(c => c.toLowerCase() === catStr.toLowerCase());
    if (matched) {
      resolvedCat = matched;
    } else {
      const lower = catStr.toLowerCase();
      if (lower.includes('yoga')) resolvedCat = 'Yoga';
      else if (lower.includes('meditation') || lower.includes('mind')) resolvedCat = 'Meditation';
      else if (lower.includes('nutrition') || lower.includes('diet')) resolvedCat = 'Nutrition';
      else if (lower.includes('ayurveda') || lower.includes('detox')) resolvedCat = 'Ayurveda';
      else if (lower.includes('holistic') || lower.includes('healing')) resolvedCat = 'Holistic';
      else resolvedCat = 'Yoga';
    }
  }

  console.log(`Input Category: "${catInput}" -> Normalized to: "${resolvedCat}"`);

  await query("UPDATE workshops SET category = $1 WHERE id = $2", [resolvedCat, ws.id]);
  console.log("   ✅ Successfully updated category in database without any error!");

  process.exit(0);
}

testUpdateCategory().catch(err => {
  console.error("❌ Test error:", err);
  process.exit(1);
});
