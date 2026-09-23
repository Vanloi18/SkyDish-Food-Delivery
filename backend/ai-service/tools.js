const serviceUrl = (name, fallback) => process.env[name] || fallback;
const restaurantService = () => serviceUrl("RESTAURANT_SERVICE_URL", "http://restaurant-service:5002");
const orderService = () => serviceUrl("ORDER_SERVICE_URL", "http://order-service:5005");
const authService = () => serviceUrl("AUTH_SERVICE_URL", "http://auth-service:4000");

async function requestJson(url, options = {}) {
  const response = await fetch(url, { ...options, headers: { Accept: "application/json", ...(options.headers || {}) } });
  if (!response.ok) throw new Error(`Tool request failed: ${response.status}`);
  return response.json();
}

export async function searchCatalog({ query = "", minPrice, maxPrice, limit = 8 }) {
  const params = new URLSearchParams({ q: query, limit: String(Math.min(limit, 20)), isAvailable: "true" });
  if (minPrice !== undefined) params.set("minPrice", String(minPrice));
  if (maxPrice !== undefined) params.set("maxPrice", String(maxPrice));
  const data = await requestJson(`${restaurantService()}/api/search?${params}`);
  return {
    foods: Array.isArray(data.foods) ? data.foods : [],
    restaurants: Array.isArray(data.restaurants) ? data.restaurants : [],
  };
}

export async function getCustomerProfile(token) {
  if (!token) return null;
  return requestJson(`${authService()}/api/auth/customer/profile`, { headers: { Authorization: token } });
}

export async function getCustomerOrders(token) {
  if (!token) return [];
  const data = await requestJson(`${orderService()}/api/orders?page=1&limit=5`, { headers: { Authorization: token } });
  return Array.isArray(data) ? data : (Array.isArray(data.data) ? data.data : []);
}

export async function getWeather(location) {
  if (!location) return null;
  const geo = await requestJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(location)}&count=1&language=vi&format=json`);
  const place = geo.results?.[0];
  if (!place) return null;
  const forecast = await requestJson(`https://api.open-meteo.com/v1/forecast?latitude=${place.latitude}&longitude=${place.longitude}&current=temperature_2m,relative_humidity_2m,weather_code,rain&timezone=auto`);
  return { location: place.name, ...forecast.current };
}
