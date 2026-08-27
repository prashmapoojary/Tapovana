/**
 * Shared Membership Validation and Discount Calculator for Frontend
 * 
 * Rules:
 * 1. Membership is ACTIVE only when join_date <= targetDate <= expiry_date.
 * 2. Once expiry_date has passed, status automatically becomes EXPIRED and pricing reverts to REGULAR (0% discount).
 * 3. Does not alter past historical transactions.
 */

export function checkMembershipValidity(member, targetDate = new Date()) {
  if (!member) {
    return { active: false, tier: "REGULAR", discountPercent: 0 };
  }

  const checkTime = new Date(targetDate).getTime();
  const rawStatus = (member.status || "active").toLowerCase();

  if (rawStatus === "cancelled" || rawStatus === "inactive") {
    return { active: false, tier: "REGULAR", discountPercent: 0 };
  }

  // Check Start / Join Date
  if (member.join_date || member.start_date) {
    const joinTime = new Date(member.join_date || member.start_date).getTime();
    if (!isNaN(joinTime) && checkTime < joinTime) {
      return { active: false, tier: "REGULAR", discountPercent: 0 };
    }
  }

  // Check End / Expiry Date
  if (member.expiry_date || member.end_date) {
    const expiry = new Date(member.expiry_date || member.end_date);
    expiry.setHours(23, 59, 59, 999);
    const expiryTime = expiry.getTime();

    if (!isNaN(expiryTime) && checkTime > expiryTime) {
      // Membership has expired
      return { active: false, tier: "REGULAR", discountPercent: 0 };
    }
  }

  // Active membership! Calculate tier discount
  const tier = (member.tier || "REGULAR").toUpperCase();
  const defaultDiscounts = {
    SILVER: 15,
    GOLD: 25,
    PLATINUM: 40,
    REGULAR: 0,
    NONE: 0
  };

  const discountPercent = member.discount_percentage !== undefined && member.discount_percentage !== null
    ? parseFloat(member.discount_percentage)
    : (defaultDiscounts[tier] || 0);

  return {
    active: discountPercent > 0,
    tier: discountPercent > 0 ? tier : "REGULAR",
    discountPercent
  };
}

export function calculateFinalPrice(basePrice, member, targetDate = new Date()) {
  const priceNum = parseFloat(basePrice) || 0;
  const validity = checkMembershipValidity(member, targetDate);

  if (!validity.active || validity.discountPercent <= 0) {
    return {
      finalPrice: priceNum,
      discountAmount: 0,
      discountPercent: 0,
      tier: "REGULAR",
      isDiscounted: false
    };
  }

  const discountAmount = (priceNum * validity.discountPercent) / 100;
  const finalPrice = Math.max(0, priceNum - discountAmount);

  return {
    finalPrice,
    discountAmount,
    discountPercent: validity.discountPercent,
    tier: validity.tier,
    isDiscounted: true
  };
}
