import React from "react";
import { Navigate, useLocation } from "react-router-dom";

export default function RestaurantPartnerGuard({ children }) {
  const location = useLocation();
  const token = localStorage.getItem("restaurantToken") || localStorage.getItem("token");

  if (!token) {
    return <Navigate to="/restaurant/login" state={{ from: location }} replace />;
  }

  return children;
}
