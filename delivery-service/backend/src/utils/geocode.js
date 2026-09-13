import fetch from "node-fetch";

const OPENCAGE_API_KEY = process.env.OPENCAGE_API_KEY || ""; 

export async function geocodeAddress(address) {
  if (OPENCAGE_API_KEY && address) {
    try {
      const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(address)}&countrycode=vn&key=${OPENCAGE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.results && data.results.length > 0) {
        const { lat, lng } = data.results[0].geometry;
        return [lng, lat]; // [longitude, latitude]
      }
    } catch (err) {
      console.warn("Geocoding API warning:", err.message);
    }
  }
  // Default fallback coordinates (Ho Chi Minh City, Vietnam)
  return [106.7009, 10.7769];
}
