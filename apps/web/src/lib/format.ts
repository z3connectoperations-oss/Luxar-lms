/** Prices are stored in paise. Format as Indian rupees. */
export const formatINR = (paise: number) =>
  "₹" + (paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 });
