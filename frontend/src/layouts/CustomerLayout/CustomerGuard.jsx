import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getValidToken, getAuthCustomer, clearCustomerAuth } from "../../utils/authHelper";

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
  const token = getValidToken();
  const customer = getAuthCustomer();

  // If token is missing, expired, or belongs to a non-customer role (e.g. driver)
  const isAuthorized = token && customer && (customer.role === "customer" || customer.role === "admin" || !customer.role);

  if (!isAuthorized) {
    if (token && !isAuthorized) {
      clearCustomerAuth();
    }
    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/auth/login?redirect=${redirectTarget}&message=${encodeURIComponent(
          "Vui lòng đăng nhập để đặt hàng."
        )}`}
        replace
      />
    );
  }

  return children;
}
