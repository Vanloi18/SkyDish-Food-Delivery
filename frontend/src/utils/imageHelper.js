import { API_URLS } from '../config/api';

/**
 * Neutral, branded SVG placeholder for restaurants (no AI or stock photos).
 */
export const RESTAURANT_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400' viewBox='0 0 600 400' fill='none'%3E%3Crect width='600' height='400' fill='%23f1f5f9'/%3E%3Cpath d='M250 160h100v80H250z' fill='%23e2e8f0' rx='8'/%3E%3Cpath d='M265 175h70v12h-70zm0 24h70v8h-70zm0 18h40v8h-40z' fill='%2394a3b8'/%3E%3Ccircle cx='300' cy='120' r='24' fill='%23cbd5e1'/%3E%3Cpath d='M292 112h16v16h-16z' fill='%2394a3b8'/%3E%3Ctext x='50%25' y='285' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' font-size='15' font-weight='600'%3ENh%C3%A0 h%C3%A0ng SkyDish%3C/text%3E%3C/svg%3E";

/**
 * Neutral, branded SVG placeholder for food items (no AI or stock photos).
 */
export const FOOD_PLACEHOLDER =
  "data:image/svg+xml;charset=UTF-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='500' height='400' viewBox='0 0 500 400' fill='none'%3E%3Crect width='500' height='400' fill='%23f1f5f9'/%3E%3Ccircle cx='250' cy='165' r='55' fill='%23e2e8f0'/%3E%3Cpath d='M235 150h30v30h-30z' fill='%2394a3b8'/%3E%3Ctext x='50%25' y='275' dominant-baseline='middle' text-anchor='middle' fill='%2364748b' font-family='-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif' font-size='15' font-weight='600'%3EM%C3%B3n %C4%83n SkyDish%3C/text%3E%3C/svg%3E";

/**
 * Validates and resolves raw image strings from backend/database to accessible public URLs.
 * Rejects local filesystem paths (e.g. F:\Downloads\ga.jpg) and returns neutral placeholder.
 *
 * @param {string|null|undefined} rawUrl
 * @param {'restaurant'|'food'} type
 * @returns {string} Safe image URL or neutral SVG placeholder
 */
export function resolveImageUrl(rawUrl, type = 'restaurant') {
  const defaultPlaceholder = type === 'food' ? FOOD_PLACEHOLDER : RESTAURANT_PLACEHOLDER;

  if (!rawUrl || typeof rawUrl !== 'string') {
    return defaultPlaceholder;
  }

  const trimmed = rawUrl.trim();
  if (!trimmed) {
    return defaultPlaceholder;
  }

  // Reject local Windows or Unix file paths that may have slipped into DB
  if (/^[a-zA-Z]:[\\/]/.test(trimmed) || trimmed.startsWith('"') || trimmed.includes('\\')) {
    return defaultPlaceholder;
  }

  // Absolute HTTP/HTTPS URLs (or data URLs)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('data:image/')) {
    return trimmed;
  }

  const backendBase = (API_URLS.RESTAURANT || 'http://localhost:5002').replace(/\/+$/, '');

  // Relative paths from uploads
  if (trimmed.startsWith('/')) {
    return `${backendBase}${trimmed}`;
  }

  return `${backendBase}/${trimmed}`;
}

/**
 * Generic image load error handler: replaces failing image with neutral SVG placeholder
 * and disables further onerror firing to prevent loops.
 *
 * @param {React.SyntheticEvent<HTMLImageElement, Event>} event
 * @param {'restaurant'|'food'} type
 */
export function handleImageError(event, type = 'restaurant') {
  const target = event.currentTarget || event.target;
  if (!target) return;
  target.onerror = null;
  target.src = type === 'food' ? FOOD_PLACEHOLDER : RESTAURANT_PLACEHOLDER;
}
