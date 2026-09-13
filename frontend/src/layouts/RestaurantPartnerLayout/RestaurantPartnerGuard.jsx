import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Validates whether a token represents a legitimate, unexpired RESTAURANT_PARTNER session.
 * 
 * Desired behavior:
 * - Guest (no token) -> false
 * - Valid RESTAURANT_PARTNER -> true
 * - Invalid / expired / wrong-role token -> false
 */
export function validateRestaurantToken(token) {
  if (!token || typeof token !== "string") return false;
  try {
    const parts = token.trim().split(".");
    if (parts.length !== 3) return false;

    // Decode JWT payload (part 1)
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    const payload = JSON.parse(jsonPayload);

    if (!payload || typeof payload !== "object") return false;

    // Check expiration if exp is present
    if (payload.exp && typeof payload.exp === "number") {
      const currentTimeInSeconds = Math.floor(Date.now() / 1000);
      if (payload.exp <= currentTimeInSeconds) {
        return false; // Expired
      }
    }

    // Role check: must be restaurant or RESTAURANT_PARTNER, or have restaurantId
    const role = (payload.role || "").toLowerCase();
    if (role === "restaurant" || role === "restaurant_partner") {
      return true;
    }
    if (payload.restaurantId && role !== "customer" && role !== "delivery" && role !== "superadmin") {
      return true;
    }

    return false;
  } catch (err) {
    return false;
  }
}

export default function RestaurantPartnerGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("restaurantToken") || localStorage.getItem("token");

  if (!validateRestaurantToken(token)) {
    // If token exists but is invalid/expired/wrong-role, clean up stale restaurantToken
    if (localStorage.getItem("restaurantToken")) {
      localStorage.removeItem("restaurantToken");
    }
    return <Navigate to="/restaurant/login" state={{ from: location }} replace />;
  }

  return children;
}

