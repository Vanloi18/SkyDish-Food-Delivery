const ARCGIS_REVERSE_URL = "https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode";
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
        location: `${lon},${lat}`,
        outSR: "4326",
        langCode: "VIE",
        f: "json",
    });
    const response = await fetch(`${ARCGIS_REVERSE_URL}?${query}`, {
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
    if (result.error || !result.address?.Match_addr) {
        const error = new Error("Không tìm thấy địa chỉ tại tọa độ GPS. Bạn vẫn có thể nhập địa chỉ thủ công.");
        error.statusCode = 502;
        throw error;
    }

    const address = result.address;
    const houseNumber = String(address.AddNum || "").trim();
    const addressLine = String(address.Address || "").trim();
    const detail = houseNumber && addressLine.toLowerCase().startsWith(houseNumber.toLowerCase())
        ? addressLine
        : [houseNumber, addressLine]
        .filter(Boolean)
        .join(" ");
    const wardCandidates = getAddressNames(address, ["Neighborhood"]);
    if (address.City && address.City !== address.Region && !wardCandidates.includes(address.City)) {
        wardCandidates.push(address.City);
    }
    const resolvedAddress = {
        provinceCandidates: getAddressNames(address, ["City", "Region"]),
        districtCandidates: getAddressNames(address, ["Subregion", "District"]),
        wardCandidates,
        detail: detail || address.PlaceName || address.Match_addr,
    };

    if (reverseCache.size >= CACHE_LIMIT) reverseCache.delete(reverseCache.keys().next().value);
    reverseCache.set(cacheKey, { address: resolvedAddress, expiresAt: Date.now() + CACHE_TTL_MS });
    return resolvedAddress;
};