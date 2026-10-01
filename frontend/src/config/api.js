// Centralized API Base URLs for SkyDish Food Delivery Platform
// When running in production / behind Nginx reverse proxy / public domain,
// all services are routed on the same origin under /api/...
// When running in standalone dev mode on non-gateway port (e.g. 3001), falls back to microservice ports.

const isDevStandalone =
  typeof window !== 'undefined' &&
  window.location.hostname === 'localhost' &&
  window.location.port !== '3000' &&
  window.location.port !== '3300' &&
  window.location.port !== '80' &&
  window.location.port !== '' &&
  !window.location.hostname.includes('ngrok');

export const API_URLS = {
  AUTH: process.env.REACT_APP_AUTH_URL || (isDevStandalone ? 'http://localhost:4000' : ''),
  RESTAURANT: process.env.REACT_APP_RESTAURANT_URL || (isDevStandalone ? 'http://localhost:5002' : ''),
  DELIVERY: process.env.REACT_APP_DELIVERY_URL || (isDevStandalone ? 'http://localhost:5003' : ''),
  PAYMENT: process.env.REACT_APP_PAYMENT_URL || (isDevStandalone ? 'http://localhost:5004' : ''),
  AI: process.env.REACT_APP_AI_URL || (isDevStandalone ? 'http://localhost:5006' : ''),
  ORDER: process.env.REACT_APP_ORDER_URL || (isDevStandalone ? 'http://localhost:5005' : ''),
};

export const getImageUrl = (rawImage) => {
  if (!rawImage) return 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=600&auto=format&fit=crop&q=80';
  if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) return rawImage;
  const base = API_URLS.RESTAURANT;
  return `${base}${rawImage.startsWith('/') ? '' : '/'}${rawImage}`;
};

export const getOrderSocketUrl = () => {
  if (typeof window !== 'undefined') {
    if (isDevStandalone) return 'http://localhost:5005';
    return window.location.origin;
  }
  return 'http://localhost:5005';
};

export const getDeliverySocketUrl = () => {
  if (typeof window !== 'undefined') {
    if (isDevStandalone) return 'http://localhost:5003';
    return window.location.origin;
  }
  return 'http://localhost:5003';
};

export default API_URLS;
