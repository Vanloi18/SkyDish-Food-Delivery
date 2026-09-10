import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  FaThLarge, 
  FaUsers, 
  FaStore, 
  FaUtensils, 
  FaReceipt, 
  FaCreditCard, 
  FaMotorcycle, 
  FaRoute, 
  FaChartBar, 
  FaHistory, 
  FaCog, 
  FaSignOutAlt, 
  FaShieldAlt,
  FaTimes,
  FaUserShield
} from "react-icons/fa";

const navModules = [
  { id: "overview", path: "/superadmin/dashboard", label: "Tổng quan", icon: FaThLarge, section: "main" },
  { id: "users", path: "/superadmin/users", label: "Người dùng", icon: FaUsers, section: "management" },
  { id: "restaurants", path: "/superadmin/restaurants", label: "Nhà hàng", icon: FaStore, section: "management" },
  { id: "foods", path: "/superadmin/foods", label: "Món ăn", icon: FaUtensils, section: "management" },
  { id: "orders", path: "/superadmin/orders", label: "Đơn hàng", icon: FaReceipt, section: "operations" },
  { id: "payments", path: "/superadmin/payments", label: "Thanh toán", icon: FaCreditCard, section: "operations" },
  { id: "shippers", path: "/superadmin/shippers", label: "Shipper", icon: FaMotorcycle, section: "logistics" },
  { id: "delivery", path: "/superadmin/delivery", label: "Giao hàng", icon: FaRoute, section: "logistics" },
  { id: "reports", path: "/superadmin/reports", label: "Báo cáo", icon: FaChartBar, section: "analytics" },
  { id: "audit-logs", path: "/superadmin/audit-logs", label: "Nhật ký hệ thống", icon: FaHistory, section: "analytics" },
  { id: "settings", path: "/superadmin/settings", label: "Cấu hình", icon: FaCog, section: "system" },
];

const AdminSidebar = ({ 
  activeTab, 
  setActiveTab, 
  collapsed, 
  mobileOpen, 
  setMobileOpen, 
  superAdminName,
  handleLogout 
}) => {
  const location = useLocation();

  const isItemActive = (item) => {
    if (activeTab === item.id) return true;
    if (location.pathname === item.path) return true;
    if (item.id === "overview" && (location.pathname === "/superadmin" || location.pathname === "/superadmin/dashboard" || location.pathname === "/super-admin/dashboard")) return true;
    return false;
  };

  return (
    <>
      {mobileOpen && (
        <div 
          className="admin-sidebar-backdrop" 
          onClick={() => setMobileOpen(false)} 
        />
      )}

      <aside className={`admin-sidebar ${collapsed ? "collapsed" : ""} ${mobileOpen ? "mobile-open" : ""}`}>
        {/* Brand Header */}
        <div className="admin-sidebar-header">
          <Link to="/superadmin/dashboard" className="admin-brand-link" onClick={() => setActiveTab("overview")}>
            <div className="admin-brand-icon">
              <FaShieldAlt />
            </div>
            {!collapsed && (
              <div style={{ display: "flex", alignItems: "center" }}>
                <span className="admin-brand-text">SkyDish</span>
                <span className="admin-brand-badge">Admin</span>
              </div>
            )}
          </Link>

          {mobileOpen && (
            <button
              type="button"
              className="admin-sidebar-toggle"
              onClick={() => setMobileOpen(false)}
            >
              <FaTimes />
            </button>
          )}
        </div>

        {/* Navigation List */}
        <div className="admin-sidebar-nav">
          {!collapsed && <span className="admin-nav-section-title">Bảng điều khiển</span>}
          {navModules.filter(m => m.section === "main").map(item => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                title={item.label}
              >
                <span className="admin-nav-item-icon"><Icon /></span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && <span className="admin-nav-section-title">Quản lý nền tảng</span>}
          {navModules.filter(m => m.section === "management").map(item => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                title={item.label}
              >
                <span className="admin-nav-item-icon"><Icon /></span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && <span className="admin-nav-section-title">Vận hành & Giao dịch</span>}
          {navModules.filter(m => m.section === "operations" || m.section === "logistics").map(item => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                title={item.label}
              >
                <span className="admin-nav-item-icon"><Icon /></span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}

          {!collapsed && <span className="admin-nav-section-title">Phân tích & Hệ thống</span>}
          {navModules.filter(m => m.section === "analytics" || m.section === "system").map(item => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`admin-nav-item ${active ? "active" : ""}`}
                onClick={() => { setActiveTab(item.id); setMobileOpen(false); }}
                title={item.label}
              >
                <span className="admin-nav-item-icon"><Icon /></span>
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </div>

        {/* Sidebar Footer */}
        <div className="admin-sidebar-footer">
          {!collapsed && (
            <div className="admin-user-summary-card">
              <div className="admin-user-avatar">
                {superAdminName?.charAt(0)?.toUpperCase() || "A"}
              </div>
              <div className="admin-user-meta">
                <p className="admin-user-name">{superAdminName}</p>
                <p className="admin-user-role">Quản trị viên hệ thống</p>
              </div>
            </div>
          )}

          <Link
            to="/superadmin/profile"
            className={`admin-nav-item ${activeTab === "profile" || location.pathname === "/superadmin/profile" ? "active" : ""}`}
            onClick={() => { setActiveTab("profile"); setMobileOpen(false); }}
            title="Hồ sơ quản trị"
          >
            <span className="admin-nav-item-icon"><FaUserShield /></span>
            {!collapsed && <span>Hồ sơ</span>}
          </Link>

          <button
            type="button"
            className="admin-nav-item"
            onClick={handleLogout}
            style={{ color: "#f87171" }}
            title="Đăng xuất"
          >
            <span className="admin-nav-item-icon"><FaSignOutAlt /></span>
            {!collapsed && <span>Đăng xuất</span>}
          </button>
        </div>
      </aside>
    </>
  );
};

export default AdminSidebar;
