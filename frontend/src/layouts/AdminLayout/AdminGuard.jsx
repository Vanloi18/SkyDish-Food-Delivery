import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { validateAdminToken, clearAdminAuth } from "../../utils/authHelper";

/**
 * Admin Route Guard
 * Strictly verifies JWT token validity and enforces administrator role ("superAdmin" | "admin").
 * Denies access to unauthenticated users, expired sessions, and non-admin roles (customer, driver, restaurant).
 */
export default function AdminGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("adminToken") || localStorage.getItem("token");

  if (!validateAdminToken(token)) {
    // If stale or invalid admin token exists, clear it
    if (localStorage.getItem("adminToken")) {
      clearAdminAuth();
    }

    const redirectTarget = encodeURIComponent(location.pathname + location.search);
    return (
      <Navigate
        to={`/superadmin/login?redirect=${redirectTarget}&message=${encodeURIComponent(
          "Vui lòng đăng nhập với tài khoản Quản trị viên để truy cập."
        )}`}
        state={{ from: location }}
        replace
      />
    );
  }

  return children;
}

