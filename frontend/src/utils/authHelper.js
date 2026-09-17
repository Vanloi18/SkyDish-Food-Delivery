/**
 * Authentication and Token Validation Helper for Customer Portal
 */

/**
 * Safely parse a JWT payload without external libraries
 * @param {string} token
 * @returns {object|null}
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== "string") return null;
  const clean = token.startsWith("Bearer ") ? token.slice(7).trim() : token.trim();
  if (!clean || clean === "null" || clean === "undefined") return null;

  try {
    const parts = clean.split(".");
    if (parts.length !== 3) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (err) {
    return null;
  }
}

/**
 * Get valid, non-expired customer/admin token
 * If token is expired or corrupt, clears stale localStorage and returns null.
 * @returns {string|null}
 */
export function getValidToken() {
  const token = localStorage.getItem("token");
  if (!token || token === "null" || token === "undefined") {
    return null;
  }

  const payload = parseJwtPayload(token);
  if (!payload) {
    clearCustomerAuth();
    return null;
  }

  // Check expiration (payload.exp in seconds)
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    clearCustomerAuth();
    return null;
  }

  return token;
}

/**
 * Get verified customer identity from JWT payload
 * @returns {object|null}
 */
export function getAuthCustomer() {
  const token = getValidToken();
  if (!token) return null;
  return parseJwtPayload(token);
}

/**
 * Clear all customer authentication keys from localStorage
 */
export function clearCustomerAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("customerToken");
  localStorage.removeItem("customerName");
  localStorage.removeItem("customerEmail");
  localStorage.removeItem("customerId");
  localStorage.removeItem("customerPhone");
}

/**
 * Validate an Administrator token (checks format, expiration, and superAdmin/admin role)
 * @param {string} token
 * @returns {boolean}
 */
export function validateAdminToken(token) {
  if (!token || typeof token !== "string") return false;
  const payload = parseJwtPayload(token);
  if (!payload || typeof payload !== "object") return false;

  // Check expiration (payload.exp in seconds)
  if (payload.exp && typeof payload.exp === "number") {
    if (payload.exp * 1000 <= Date.now()) {
      return false; // Expired
    }
  }

  // Strictly enforce superAdmin or admin role
  const role = (payload.role || "").toLowerCase();
  return role === "superadmin" || role === "admin";
}

/**
 * Get valid, non-expired administrator token
 * Looks up 'adminToken' first, falling back to 'token'
 * @returns {string|null}
 */
export function getValidAdminToken() {
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");
  if (!token || !validateAdminToken(token)) {
    return null;
  }
  return token;
}

/**
 * Clear administrator authentication keys from localStorage
 */
export function clearAdminAuth() {
  localStorage.removeItem("adminToken");
  localStorage.removeItem("superAdminName");
}

/**
 * Helper to build auth headers
 * @returns {object}
 */
export function getAuthHeaders() {
  const token = getValidToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

