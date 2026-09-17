export function validateRestaurantToken(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((character) => "%" + ("00" + character.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);
    if (!payload || typeof payload !== "object") return false;
    if (payload.exp && typeof payload.exp === "number" && payload.exp <= Math.floor(Date.now() / 1000)) return false;

    const role = (payload.role || "").toLowerCase();
    if (role === "restaurant" || role === "restaurant_partner") return true;
    return Boolean(payload.restaurantId && !["customer", "delivery", "driver", "superadmin", "admin"].includes(role));
  } catch (error) {
    return false;
  }
}
