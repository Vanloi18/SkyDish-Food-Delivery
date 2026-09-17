import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { validateRestaurantToken } from "./restaurantToken";

export { validateRestaurantToken } from "./restaurantToken";

/**
 * Validates whether a token represents a legitimate, unexpired RESTAURANT_PARTNER session.
 * 
 * Desired behavior:
 * - Guest (no token) -> false
 * - Valid RESTAURANT_PARTNER -> true
 * - Invalid / expired / wrong-role token -> false
 */
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

