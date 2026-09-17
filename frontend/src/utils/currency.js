/**
 * Centralized Currency Formatter & Parser for Vietnamese Dong (VND / ₫)
 * 
 * Standard formatting rules:
 * - Whole number amounts formatted with dot (.) thousand separators:
 *   - 119000 -> "119.000 ₫"
 *   - 98333  -> "98.333 ₫"
 *   - 70500  -> "70.500 ₫"
 *   - 0      -> "0 ₫"
 * - Decimal/fractional amounts preserved exactly without precision loss:
 *   - 98.333 -> "98.333 ₫" (never rounded to 98 ₫)
 */

export const parsePrice = (amount) => {
  if (typeof amount === "number") return isNaN(amount) ? 0 : amount;
  if (!amount) return 0;
  const str = String(amount).trim();

  // If string contains multiple dots (e.g. "1.500.000" thousand separators)
  if ((str.match(/\./g) || []).length > 1) {
    const cleanedMultiple = str.replace(/\./g, "").replace(",", ".");
    const num = parseFloat(cleanedMultiple);
    return isNaN(num) ? 0 : num;
  }

  const cleaned = str.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || amount === "") return "0 ₫";
  const num = typeof amount === "number" ? amount : parsePrice(amount);
  if (isNaN(num)) return "0 ₫";

  // Preserve decimal/fractional precision (e.g. 98.333)
  if (num % 1 !== 0) {
    const parts = String(num).split(".");
    const integerPart = new Intl.NumberFormat("vi-VN", {
      maximumFractionDigits: 0,
    }).format(Number(parts[0]));
    return `${integerPart}.${parts[1]} ₫`;
  }

  // Integer amounts with vi-VN locale thousands separator
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(num);
  return `${formatted} ₫`;
};

export const formatVND = formatCurrency;

export default formatCurrency;
