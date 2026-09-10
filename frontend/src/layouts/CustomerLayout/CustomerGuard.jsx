import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Customer Authentication Route Guard
 * Enforces authentication for private customer operations:
 * - Checkout & Payment (/checkout)
 * - Order History & Order Details (/orders, /orders/details/:id)
 * - Customer Profile (/customer/profile)
 * 
 * Public operations (Guest) remain accessible without login:
 * - Landing Page (/)
 * - Search & Restaurant Discovery (/customer/home, /restaurants)
 * - Restaurant Detail & Food Menu (/customer/restaurant/:id/foods)
 * - Food item prices & descriptions
 * - Cart inspection (/customer/cart)
 */
export default function CustomerGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/auth/login?redirect=${redirectTarget}`} replace />;
  }

  return children;
}
