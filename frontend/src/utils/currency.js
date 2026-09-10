/**
 * Centralized Currency Formatter & Parser for Vietnamese Dong (VND / ₫)
 * 
 * Standard formatting rules:
 * - Whole number amounts (no decimals in VND)
 * - Dot (.) thousand separators
 * - ₫ symbol suffix (e.g. "85.000 ₫", "1.500.000 ₫", "0 ₫")
 */

export const parsePrice = (amount) => {
  if (typeof amount === "number") return isNaN(amount) ? 0 : amount;
  if (!amount) return 0;
  const str = String(amount).trim();
  if (str.includes(".") && !str.includes(",")) {
    const parts = str.split(".");
    if (parts.length > 1 && parts[parts.length - 1].replace(/\D/g, "").length === 3) {
      const num = parseInt(str.replace(/\D/g, ""), 10);
      return isNaN(num) ? 0 : num;
    }
  }
  const cleaned = str.replace(/[^0-9.-]/g, "");
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

export const formatCurrency = (amount) => {
  const num = parsePrice(amount);
  // Format as integer with vi-VN locale
  const formatted = new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 0,
  }).format(num);
  return `${formatted} ₫`;
};

export const formatVND = formatCurrency;

export default formatCurrency;
