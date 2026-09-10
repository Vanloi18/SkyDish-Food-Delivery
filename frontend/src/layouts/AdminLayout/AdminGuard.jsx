import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function AdminGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/superadmin/login" state={{ from: location }} replace />;
  }

  return children;
}
