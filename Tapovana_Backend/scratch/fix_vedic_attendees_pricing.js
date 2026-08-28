const { query } = require('../src/config/db');
const { getValidCustomerMembership } = require('../src/utils/membershipHelper');

async function fixVedicAttendeesPricing() {
  console.log("=== RECALCULATING AND SAVING VEDIC ATTENDEES MEMBERSHIP PRICING ===");

  try {
    const attendeesRes = await query(`SELECT * FROM vedic_attendees`);
    console.log(`Found ${attendeesRes.rows.length} total vedic attendees rows.`);

    for (const att of attendeesRes.rows) {
      const email = att.email;
      const name = att.name;

      const resolved = await getValidCustomerMembership(email, name);
      let tier = 'REGULAR';
      let discountPct = 0;

      if (resolved.active) {
        tier = resolved.tier;
        discountPct = Math.round(resolved.discountRate * 100);
      } else if (att.membership_tier && !['STANDARD', 'REGULAR', 'NONE', 'N/A'].includes(String(att.membership_tier).toUpperCase())) {
        tier = String(att.membership_tier).toUpperCase();
        const defaultDiscounts = { 'SILVER': 15, 'GOLD': 25, 'PLATINUM': 40 };
        discountPct = defaultDiscounts[tier] || 0;
      }

      let origNum = 18000;
      if (att.original_price) {
        origNum = parseFloat(String(att.original_price).replace(/[^0-9.]/g, '')) || 18000;
      }

      const discountNum = Math.round((origNum * discountPct) / 100);
      const finalNum = Math.max(0, origNum - discountNum);

      const origStr = `₹${origNum.toLocaleString('en-IN')}`;
      const discStr = discountNum > 0 ? `₹${discountNum.toLocaleString('en-IN')} (${discountPct}%)` : `₹0 (0%)`;
      const finalStr = `₹${finalNum.toLocaleString('en-IN')}`;

      await query(
        `UPDATE vedic_attendees
         SET membership_tier = $1, original_price = $2, discount_amount = $3, final_price = $4
         WHERE id = $5`,
        [tier.toUpperCase(), origStr, discStr, finalStr, att.id]
      );

      console.log(`Updated Attendee ID ${att.id}: ${name} (${email}) -> Tier: ${tier.toUpperCase()} | Final: ${finalStr}`);
    }

    console.log("\nAll vedic attendees pricing successfully recalculated and saved!");

  } catch (e) {
    console.error("Fix error:", e);
  }

  process.exit(0);
}

fixVedicAttendeesPricing();
