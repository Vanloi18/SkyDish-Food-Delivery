import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AdminSidebar from "../../pages/admin/AdminSidebar";
import AdminTopbar from "../../pages/admin/AdminTopbar";
import "../../styles/admin.css";

export default function AdminLayout({ children, activeTab: propTab }) {
  const location = useLocation();
  const navigate = useNavigate();

  // Derive tab from pathname
  const getTabFromPath = () => {
    const p = location.pathname;
    if (p.includes("/users")) return "users";
    if (p.includes("/restaurants")) return "restaurants";
    if (p.includes("/foods")) return "foods";
    if (p.includes("/orders")) return "orders";
    if (p.includes("/payments")) return "payments";
    if (p.includes("/shippers")) return "shippers";
    if (p.includes("/delivery")) return "delivery";
    if (p.includes("/reports")) return "reports";
    if (p.includes("/audit-logs")) return "audit-logs";
    if (p.includes("/settings")) return "settings";
    if (p.includes("/profile")) return "profile";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(propTab || getTabFromPath());
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [superAdminName, setSuperAdminName] = useState("Quản trị viên");
  const [globalSearch, setGlobalSearch] = useState("");

  useEffect(() => {
    setActiveTab(propTab || getTabFromPath());
  }, [location.pathname, propTab]);

  useEffect(() => {
    const name = localStorage.getItem("superAdminName");
    if (name) setSuperAdminName(name);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("superAdminName");
    navigate("/superadmin/login");
  };

  return (
    <div className="admin-layout-wrapper">
      {/* 1. Admin Sidebar */}
      <AdminSidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        collapsed={collapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        superAdminName={superAdminName}
        handleLogout={handleLogout}
      />

      {/* 2. Admin Main Area */}
      <div className={`admin-main-area ${collapsed ? "sidebar-collapsed" : ""}`}>
        {/* Topbar with Breadcrumbs, Global Search & Profile */}
        <AdminTopbar
          activeTab={activeTab}
          collapsed={collapsed}
          setCollapsed={setCollapsed}
          mobileOpen={mobileOpen}
          setMobileOpen={setMobileOpen}
          superAdminName={superAdminName}
          handleLogout={handleLogout}
          setActiveTab={setActiveTab}
          globalSearch={globalSearch}
          setGlobalSearch={setGlobalSearch}
        />

        {/* Content Canvas */}
        <main className="admin-content-canvas">
          {typeof children === "function" ? children({ globalSearch, setGlobalSearch }) : children}
        </main>
      </div>
    </div>
  );
}
