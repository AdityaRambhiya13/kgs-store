/**
 * Shared pricing utilities for KGS.
 * Ensures consistent MRP calculation across the app.
 */

/**
 * Calculates MRP based on price and product ID (for pseudo-randomness).
 * Returns an integer rounded to the nearest 5.
 * @param {number} price
 * @param {number} id
 * @returns {number}
 */
export function getMRP(price, id = 1) {
  // 10% to 35% markup based on product ID
  const pct = 10 + ((id * 3 + 7) % 26);
  return Math.ceil((price * (1 + pct / 100)) / 5) * 5;
}

/**
 * Calculates saving percentage.
 * @param {number} price
 * @param {number} mrp
 * @returns {number}
 */
export function getDiscount(price, mrp) {
  if (!mrp || mrp <= price) return 0;
  return Math.round(((mrp - price) / mrp) * 100);
}
