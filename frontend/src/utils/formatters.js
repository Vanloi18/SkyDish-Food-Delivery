// Re-export common formatters for convenience and cross-compatibility
export { formatCurrency, formatVND, parsePrice, default as currency } from './currency';

export const formatDate = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleDateString('vi-VN');
};

export const formatDateTime = (date) => {
  if (!date) return '';
  return new Date(date).toLocaleString('vi-VN');
};
