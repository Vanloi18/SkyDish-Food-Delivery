const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const CACHE_TTL_MS = 15 * 60 * 1000;
const CACHE_LIMIT = 512;
const reverseCache = new Map();
let lastRequestAt = 0;

const getAddressNames = (address, fields) => [...new Set(fields.map((field) => address[field]).filter(Boolean))];

export const reverseGeocodeCoordinates = async ({ latitude, longitude }) => {
    const lat = Number(latitude);
    const lon = Number(longitude);
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) {
        const error = new Error("Tọa độ vị trí không hợp lệ.");
        error.statusCode = 400;
        throw error;
    }

    const cacheKey = `${lat.toFixed(5)},${lon.toFixed(5)}`;
    const cached = reverseCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) return cached.address;

    const delay = Math.max(0, 1000 - (Date.now() - lastRequestAt));
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    lastRequestAt = Date.now();

    const query = new URLSearchParams({
        format: "jsonv2",
        lat: String(lat),
        lon: String(lon),
        zoom: "18",
        addressdetails: "1",
    });
    const response = await fetch(`${NOMINATIM_URL}?${query}`, {
        headers: {
            "Accept-Language": "vi",
            "User-Agent": "SkyDish-Food-Delivery/1.0",
        },
        signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
        const error = new Error("Không thể xác định địa chỉ từ vị trí GPS. Bạn vẫn có thể nhập địa chỉ thủ công.");
        error.statusCode = 502;
        throw error;
    }

    const result = await response.json();
    const address = result.address || {};
    const detail = [address.house_number, address.road || address.residential || address.pedestrian]
        .filter(Boolean)
        .join(" ");
    const resolvedAddress = {
        provinceCandidates: getAddressNames(address, ["state", "province", "region", "city"]),
        districtCandidates: getAddressNames(address, ["city_district", "district", "county", "state_district", "municipality", "suburb"]),
        wardCandidates: getAddressNames(address, ["suburb", "quarter", "neighbourhood", "village", "town", "hamlet"]),
        detail: detail || result.name || "",
    };

    if (reverseCache.size >= CACHE_LIMIT) reverseCache.delete(reverseCache.keys().next().value);
    reverseCache.set(cacheKey, { address: resolvedAddress, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolvedAddress;
};