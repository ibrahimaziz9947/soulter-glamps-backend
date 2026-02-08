/**
 * Calculate final price for a glamp based on discount logic
 * @param {Object} glamp - Glamp object with pricePerNight, discountEnabled, and discountPercent
 * @returns {number} Final calculated price
 */
export const calculateGlampPrice = (glamp) => {
  if (glamp.discountEnabled && glamp.discountPercent > 0) {
    const discountAmount = Math.floor((glamp.pricePerNight * glamp.discountPercent) / 100);
    return glamp.pricePerNight - discountAmount;
  }
  return glamp.pricePerNight;
};

/**
 * Enhance glamp object with pricing details
 * @param {Object} glamp - Glamp object from DB
 * @returns {Object} Glamp object with finalPrice field
 */
export const enhanceGlampWithPricing = (glamp) => {
  return {
    ...glamp,
    finalPrice: calculateGlampPrice(glamp)
  };
};
