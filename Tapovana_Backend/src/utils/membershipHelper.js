const { query } = require('../config/db');

/**
 * Validates whether a customer has an active membership on a given target date.
 * 
 * Rules:
 * 1. Membership is ACTIVE only when join_date <= targetDate <= expiry_date.
 * 2. If targetDate > expiry_date, membership is EXPIRED and pricing reverts to REGULAR (0% discount).
 * 3. Does not modify past historical booking records.
 * 
 * @param {string} emailOrId Customer email or identifier
 * @param {string} name Customer full name
 * @param {Date|string} targetDate Date to check membership validity against (default: NOW)
 * @returns {Promise<{active: boolean, tier: string, discountRate: number, passDetails: string|null}>}
 */
const getValidCustomerMembership = async (emailOrId, name, targetDate = new Date()) => {
  const ident = emailOrId ? String(emailOrId).trim().toLowerCase() : '';
  const nameVal = name ? String(name).trim().toLowerCase() : '';

  if (!ident && !nameVal) {
    return { active: false, tier: 'REGULAR', discountRate: 0, passDetails: null };
  }

  try {
    const checkDate = targetDate ? new Date(targetDate) : new Date();
    const checkTime = checkDate.getTime();

    const memRes = await query(
      `SELECT m.id, m.name, m.email, m.tier, m.status, m.join_date, m.expiry_date, mt.discount_percentage
       FROM memberships m
       LEFT JOIN membership_tiers mt ON UPPER(m.tier) = UPPER(mt.name)
       WHERE (LOWER(m.email) = $1 OR LOWER(m.name) = $2 OR LOWER(m.name) LIKE $3 OR $2 LIKE '%' || LOWER(m.name) || '%')
         AND (LOWER(m.status) IS NULL OR LOWER(m.status) = 'active')`,
      [ident, nameVal, `%${nameVal}%`]
    );

    if (memRes.rows.length === 0) {
      return { active: false, tier: 'REGULAR', discountRate: 0, passDetails: null };
    }

    const membership = memRes.rows[0];
    const tier = (membership.tier || 'REGULAR').toUpperCase();

    // Check Start / Join Date
    if (membership.join_date) {
      const joinTime = new Date(membership.join_date).getTime();
      if (!isNaN(joinTime) && checkTime < joinTime) {
        return { active: false, tier: 'REGULAR', discountRate: 0, passDetails: null };
      }
    }

    // Check End / Expiry Date
    if (membership.expiry_date) {
      const expiryDate = new Date(membership.expiry_date);
      expiryDate.setHours(23, 59, 59, 999);
      const expiryTime = expiryDate.getTime();

      if (!isNaN(expiryTime) && checkTime > expiryTime) {
        return { active: false, tier: 'REGULAR', discountRate: 0, passDetails: null };
      }
    }

    // Membership is valid & active! Calculate discount rate
    let discountRate = 0;
    if (membership.discount_percentage !== null && membership.discount_percentage !== undefined) {
      discountRate = (parseFloat(membership.discount_percentage) || 0) / 100;
    } else {
      const defaultDiscounts = { 'SILVER': 0.15, 'GOLD': 0.25, 'PLATINUM': 0.40 };
      discountRate = defaultDiscounts[tier] || 0;
    }

    const passDetails = `${tier.charAt(0) + tier.slice(1).toLowerCase()} Tier`;
    return {
      active: true,
      tier,
      discountRate,
      passDetails
    };
  } catch (err) {
    console.error('[MembershipHelper] Error checking customer membership validity:', err);
    return { active: false, tier: 'REGULAR', discountRate: 0, passDetails: null };
  }
};

module.exports = {
  getValidCustomerMembership
};
