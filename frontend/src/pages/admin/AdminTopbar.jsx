import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { 
  FaBars, 
  FaSearch, 
  FaBell, 
  FaUserShield, 
  FaCog, 
  FaSignOutAlt, 
  FaChevronDown,
  FaCheckCircle,
  FaInfoCircle,
  FaChevronRight
} from "react-icons/fa";

const moduleLabels = {
  overview: "Tổng quan",
  users: "Người dùng",
  restaurants: "Nhà hàng",
  foods: "Món ăn",
  orders: "Đơn hàng",
  payments: "Thanh toán",
  shippers: "Shipper",
  delivery: "Giao hàng",
  reports: "Báo cáo & Phân tích",
  "audit-logs": "Nhật ký hệ thống",
  settings: "Cấu hình hệ thống",
  profile: "Hồ sơ quản trị viên",
};

const AdminTopbar = ({ 
  activeTab,
  collapsed, 
  setCollapsed, 
  mobileOpen, 
  setMobileOpen, 
  superAdminName, 
  handleLogout, 
  setActiveTab,
  globalSearch,
  setGlobalSearch 
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const notifications = [
    { id: 1, title: "Hệ thống 5 vi dịch vụ hoạt động ổn định", time: "Vừa xong", type: "success" },
    { id: 2, title: "Đã kích hoạt hỗ trợ 4 cổng thanh toán (Stripe, VNPay, MoMo, COD)", time: "5 phút trước", type: "info" },
    { id: 3, title: "Chuẩn hóa tiền tệ Việt Nam Đồng (VND / ₫)", time: "Hôm nay", type: "success" },
    { id: 4, title: "16 nhà hàng đối tác thực tế tại Hà Nội đã đồng bộ", time: "Hôm nay", type: "success" },
  ];

  const currentLabel = moduleLabels[activeTab] || "Tổng quan";

  return (
    <header className="admin-topbar">
      <div className="admin-topbar-left">
        {/* Sidebar Toggle for Desktop & Mobile */}
        <button
          type="button"
          className="admin-icon-btn"
          onClick={() => {
            if (window.innerWidth <= 1024) {
              setMobileOpen(!mobileOpen);
            } else {
              setCollapsed(!collapsed);
            }
          }}
          aria-label="Thu gọn / Mở rộng Sidebar"
        >
          <FaBars />
        </button>

        {/* Breadcrumb Navigation */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.85rem", color: "var(--admin-text-secondary)" }}>
          <span style={{ fontWeight: "600", color: "var(--admin-text-muted)" }}>SkyDish Admin</span>
          <FaChevronRight size={10} style={{ color: "var(--admin-text-muted)" }} />
          <span style={{ fontWeight: "700", color: "var(--admin-text-main)" }}>{currentLabel}</span>
        </div>

        {/* Global Search Box */}
        <div className="admin-search-wrapper" style={{ marginLeft: "1rem" }}>
          <FaSearch className="admin-search-icon" />
          <input
            type="text"
            className="admin-search-input"
            placeholder="Tìm kiếm nhanh toàn hệ thống..."
            value={globalSearch}
            onChange={(e) => setGlobalSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="admin-topbar-right">
        {/* Notifications Dropdown */}
        <div style={{ position: "relative" }} ref={notifRef}>
          <button
            type="button"
            className="admin-icon-btn"
            onClick={() => setNotifOpen(!notifOpen)}
            title="Thông báo hệ thống"
          >
            <FaBell />
            <span className="admin-icon-badge-dot" />
          </button>

          {notifOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "330px",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                border: "1px solid var(--admin-border)",
                padding: "0.75rem 0",
                zIndex: 1000,
              }}
            >
              <div style={{ padding: "0.5rem 1rem", borderBottom: "1px solid var(--admin-border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700" }}>Thông báo hệ thống</span>
                <span style={{ fontSize: "0.72rem", color: "var(--admin-primary)", fontWeight: "600" }}>{notifications.length} mới</span>
              </div>
              <div>
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    style={{
                      padding: "0.75rem 1rem",
                      borderBottom: "1px solid var(--admin-border-subtle)",
                      display: "flex",
                      gap: "0.65rem",
                      alignItems: "flex-start",
                    }}
                  >
                    {n.type === "success" ? (
                      <FaCheckCircle style={{ color: "#10b981", marginTop: "2px", flexShrink: 0 }} />
                    ) : (
                      <FaInfoCircle style={{ color: "#3b82f6", marginTop: "2px", flexShrink: 0 }} />
                    )}
                    <div>
                      <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: "600", color: "var(--admin-text-main)" }}>
                        {n.title}
                      </p>
                      <span style={{ fontSize: "0.7rem", color: "var(--admin-text-muted)" }}>{n.time}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Current Admin Dropdown */}
        <div style={{ position: "relative" }} ref={dropdownRef}>
          <div
            className="admin-topbar-user"
            onClick={() => setDropdownOpen(!dropdownOpen)}
          >
            <div className="admin-user-avatar" style={{ width: "32px", height: "32px" }}>
              {superAdminName?.charAt(0)?.toUpperCase() || "A"}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: "700", color: "var(--admin-text-main)" }}>
                  {superAdminName}
                </span>
                <FaChevronDown size={10} style={{ color: "var(--admin-text-muted)" }} />
              </div>
              <span style={{ fontSize: "0.68rem", color: "var(--admin-text-muted)", fontWeight: "600" }}>
                Quản trị viên
              </span>
            </div>
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 8px)",
                right: 0,
                width: "210px",
                backgroundColor: "#ffffff",
                borderRadius: "10px",
                boxShadow: "0 10px 25px rgba(0,0,0,0.1)",
                border: "1px solid var(--admin-border)",
                padding: "0.5rem",
                zIndex: 1000,
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <Link
                to="/superadmin/profile"
                onClick={() => { setActiveTab("profile"); setDropdownOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "var(--admin-text-main)",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--admin-canvas)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FaUserShield style={{ color: "#3b82f6" }} /> Hồ sơ quản trị
              </Link>

              <Link
                to="/superadmin/settings"
                onClick={() => { setActiveTab("settings"); setDropdownOpen(false); }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.6rem 0.85rem",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "var(--admin-text-main)",
                  textDecoration: "none",
                  fontWeight: "600",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--admin-canvas)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FaCog style={{ color: "#64748b" }} /> Cài đặt hệ thống
              </Link>

              <div style={{ height: "1px", backgroundColor: "var(--admin-border)", margin: "0.25rem 0" }} />

              <button
                type="button"
                onClick={handleLogout}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.65rem",
                  padding: "0.6rem 0.85rem",
                  border: "none",
                  background: "none",
                  borderRadius: "6px",
                  fontSize: "0.85rem",
                  color: "#ef4444",
                  cursor: "pointer",
                  width: "100%",
                  textAlign: "left",
                  fontWeight: "600",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
              >
                <FaSignOutAlt /> Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AdminTopbar;
