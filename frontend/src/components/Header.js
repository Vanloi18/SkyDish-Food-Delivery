import { API_URLS } from '../config/api';
import React, { useState, useEffect, useRef, useContext, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  FaUtensils, 
  FaShoppingCart, 
  FaUserCircle, 
  FaStore, 
  FaMotorcycle, 
  FaShieldAlt, 
  FaSignOutAlt, 
  FaReceipt,
  FaChevronDown,
  FaBars,
  FaBell,
  FaSearch
} from "react-icons/fa";
import { CartContext } from "../pages/contexts/CartContext";
import Sidebar from "./Sidebar";
import Button from "./common/Button";
import { validateRestaurantToken } from "../layouts/RestaurantPartnerLayout/RestaurantPartnerGuard";
import { getValidToken, getAuthCustomer, clearCustomerAuth } from "../utils/authHelper";
import "../styles/header.css";

function Header() {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isLoggedIn, setLoggedIn] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [showPortalsDropdown, setShowPortalsDropdown] = useState(false);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const [headerSearch, setHeaderSearch] = useState("");

  const { totalItemCount } = useContext(CartContext) || { totalItemCount: 0 };
  const navigate = useNavigate();
  const location = useLocation();

  const profileRef = useRef();
  const portalsRef = useRef();
  const notifRef = useRef();

  const fetchNotifications = useCallback(async () => {
    try {
      const custId = localStorage.getItem("customerId") || localStorage.getItem("customerEmail") || "customer";
      const res = await fetch(`${API_URLS.RESTAURANT}/api/notifications?userId=${custId}&role=customer`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadNotifCount(data.unreadCount || 0);
      }
    } catch (e) {
      console.warn("Could not fetch notifications:", e.message);
    }
  }, []);

  const handleMarkAllRead = async () => {
    try {
      const custId = localStorage.getItem("customerId") || localStorage.getItem("customerEmail") || "customer";
      await fetch(`${API_URLS.RESTAURANT}/api/notifications/read-all`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: custId, role: "customer" }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadNotifCount(0);
    } catch (e) {
      console.warn("Error marking all read:", e);
    }
  };

  const handleMarkSingleRead = async (notifId) => {
    try {
      await fetch(`${API_URLS.RESTAURANT}/api/notifications/${notifId}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.warn("Error marking read:", e);
    }
  };

  useEffect(() => {
    const validToken = getValidToken();
    const customer = getAuthCustomer();
    const isCustomerLoggedIn = !!(validToken && customer);
    setLoggedIn(isCustomerLoggedIn);

    if (isCustomerLoggedIn) {
      const cachedName = customer.name || localStorage.getItem("customerName") || "Khách hàng";
      const cachedEmail = customer.email || localStorage.getItem("customerEmail") || "";
      setUserProfile({ name: cachedName, email: cachedEmail });
      fetchNotifications();
    } else {
      setUserProfile(null);
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [location.pathname, fetchNotifications]);

  // Click outside and Escape key listener for dropdowns
  useEffect(() => {
    function handleClickOutside(e) {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileDropdown(false);
      }
      if (portalsRef.current && !portalsRef.current.contains(e.target)) {
        setShowPortalsDropdown(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
    }

    function handleKeyDown(e) {
      if (e.key === "Escape") {
        setShowProfileDropdown(false);
        setShowPortalsDropdown(false);
        setShowNotifDropdown(false);
        setSidebarOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = () => {
    clearCustomerAuth();
    setLoggedIn(false);
    setShowProfileDropdown(false);
    navigate("/auth/login");
  };

  /**
   * Smart auth-aware routing for "Đối tác nhà hàng" in portals dropdown.
   * Uses existing guard architecture to validate token legitimacy:
   * - Guest (no token)                  → /restaurant/login
   * - Valid RESTAURANT_PARTNER          → /restaurant/dashboard
   * - Invalid / expired / wrong role    → /restaurant/login
   */
  const handleRestaurantPartnerClick = () => {
    setShowPortalsDropdown(false);
    const token = localStorage.getItem("restaurantToken") || localStorage.getItem("token");
    if (validateRestaurantToken(token)) {
      navigate("/restaurant/dashboard");
    } else {
      navigate("/restaurant/login");
    }
  };

  const handleShipperClick = () => {
    setShowPortalsDropdown(false);
    const driverToken = localStorage.getItem("driverToken");
    if (driverToken) {
      navigate("/delivery/dashboard");
    } else {
      navigate("/delivery/login");
    }
  };

  const handleAdminClick = () => {
    setShowPortalsDropdown(false);
    const superAdminName = localStorage.getItem("superAdminName");
    if (superAdminName) {
      navigate("/superadmin/dashboard");
    } else {
      navigate("/superadmin/login");
    }
  };

  const handleCustomerClick = () => {
    setShowPortalsDropdown(false);
    navigate("/customer/home");
  };

  const isActive = (path) => location.pathname === path;

  const handleHeaderSearch = (event) => {
    event.preventDefault();
    const query = headerSearch.trim();
    navigate(query ? `/customer/home?q=${encodeURIComponent(query)}` : "/customer/home");
  };

  return (
    <>
      <motion.header
        className="home-header"
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <div className="header-left">
          <div
            className="hamburger-menu"
            onClick={() => setSidebarOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                setSidebarOpen(true);
              }
            }}
            title="Mở menu điều hướng"
            role="button"
            tabIndex={0}
            aria-label="Mở menu điều hướng"
            aria-expanded={isSidebarOpen}
          >
            <FaBars size={18} />
          </div>

          <Link to="/" className="logo-brand">
            <div className="logo-icon-badge">
              <FaUtensils size={18} />
            </div>
            <span>Sky</span>Dish
          </Link>

          <nav className="header-nav-links">
            <Link
              to="/"
              className={`nav-link-item ${isActive("/") ? "active" : ""}`}
            >
              Trang chủ
            </Link>
            <Link
              to="/customer/home"
              className={`nav-link-item ${
                isActive("/customer/home") ? "active" : ""
              }`}
            >
              Nhà hàng
            </Link>
            <Link
              to="/orders"
              className={`nav-link-item ${isActive("/orders") ? "active" : ""}`}
            >
              Đơn hàng của tôi
            </Link>
          </nav>

          <form className="header-search" onSubmit={handleHeaderSearch} role="search">
            <FaSearch aria-hidden="true" size={14} />
            <input
              value={headerSearch}
              onChange={(event) => setHeaderSearch(event.target.value)}
              placeholder="Tìm món ăn, nhà hàng..."
              aria-label="Tìm món ăn hoặc nhà hàng"
            />
            <button type="submit" aria-label="Tìm kiếm">Tìm</button>
          </form>
        </div>

        <div className="header-right">
          {/* Portals Switcher */}
          <div className="portals-dropdown-container" ref={portalsRef}>
            <button
              type="button"
              className="portals-trigger-btn"
              onClick={() => setShowPortalsDropdown((v) => !v)}
              aria-expanded={showPortalsDropdown}
              aria-haspopup="menu"
            >
              Cổng đối tác <FaChevronDown size={10} />
            </button>

            <AnimatePresence>
              {showPortalsDropdown && (
                <motion.div
                  className="profile-dropdown-card"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ width: "230px" }}
                >
                  <button
                    type="button"
                    className="header_dropdown-item"
                    onClick={handleCustomerClick}
                    aria-label="Cổng khách hàng"
                  >
                    <FaUtensils style={{ color: "var(--sd-primary)" }} /> Khách hàng
                  </button>
                  <button
                    type="button"
                    className="header_dropdown-item"
                    onClick={handleRestaurantPartnerClick}
                    aria-label="Cổng đối tác nhà hàng"
                  >
                    <FaStore style={{ color: "#3b82f6" }} /> Đối tác nhà hàng
                  </button>
                  <button
                    type="button"
                    className="header_dropdown-item"
                    onClick={handleShipperClick}
                    aria-label="Cổng đối tác shipper"
                  >
                    <FaMotorcycle style={{ color: "#10b981" }} /> Shipper
                  </button>
                  <button
                    type="button"
                    className="header_dropdown-item"
                    onClick={handleAdminClick}
                    aria-label="Cổng quản trị viên"
                  >
                    <FaShieldAlt style={{ color: "#8b5cf6" }} /> Quản trị viên
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Notification Bell Icon */}
          <div className="portals-dropdown-container" ref={notifRef} style={{ position: "relative" }}>
            <button
              type="button"
              className="cart-header-btn"
              title="Thông báo"
              onClick={() => setShowNotifDropdown((v) => !v)}
              aria-expanded={showNotifDropdown}
              aria-haspopup="dialog"
              style={{ position: "relative" }}
            >
              <FaBell size={17} />
              {unreadNotifCount > 0 && (
                <span className="cart-badge-count" style={{ backgroundColor: "#ef4444" }}>
                  {unreadNotifCount > 9 ? "9+" : unreadNotifCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {showNotifDropdown && (
                <motion.div
                  className="profile-dropdown-card"
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  style={{ width: "320px", right: 0, left: "auto", padding: "0.75rem", maxHeight: "400px", overflowY: "auto" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #f1f5f9", paddingBottom: "0.5rem", marginBottom: "0.5rem" }}>
                    <strong style={{ fontSize: "0.85rem", color: "#0f172a" }}>Thông báo {isLoggedIn ? `(${notifications.length})` : ""}</strong>
                    {isLoggedIn && unreadNotifCount > 0 && (
                      <button
                        type="button"
                        style={{ background: "none", border: "none", color: "var(--sd-primary)", fontSize: "0.75rem", fontWeight: "600", cursor: "pointer" }}
                        onClick={handleMarkAllRead}
                      >
                        Đã đọc tất cả
                      </button>
                    )}
                  </div>

                  {!isLoggedIn ? (
                    <div style={{ textAlign: "center", padding: "1.25rem 0.5rem" }}>
                      <p style={{ margin: "0 0 0.85rem 0", fontSize: "0.85rem", color: "#64748b", lineHeight: "1.4" }}>
                        Vui lòng đăng nhập để xem thông báo cập nhật đơn hàng và ưu đãi của bạn.
                      </p>
                      <Button
                        variant="primary"
                        size="sm"
                        fullWidth
                        onClick={() => {
                          setShowNotifDropdown(false);
                          navigate("/auth/login");
                        }}
                      >
                        Đăng nhập ngay
                      </Button>
                    </div>
                  ) : notifications.length === 0 ? (
                    <p style={{ margin: "1rem 0", textAlign: "center", fontSize: "0.8rem", color: "#94a3b8" }}>
                      Bạn chưa có thông báo mới nào.
                    </p>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        onClick={() => handleMarkSingleRead(n._id)}
                        style={{
                          padding: "0.6rem 0.75rem",
                          borderRadius: "8px",
                          marginBottom: "0.4rem",
                          backgroundColor: n.isRead ? "#ffffff" : "#fff7ed",
                          border: `1px solid ${n.isRead ? "#f1f5f9" : "#ffedd5"}`,
                          cursor: "pointer",
                          transition: "background 0.15s ease",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.8rem", fontWeight: n.isRead ? "600" : "700", color: "#0f172a" }}>{n.title}</span>
                          {!n.isRead && <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: "#ef4444" }} />}
                        </div>
                        <p style={{ margin: "0.2rem 0 0 0", fontSize: "0.75rem", color: "#64748b", lineHeight: "1.3" }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Cart Icon */}
          <Link
            to="/customer/cart"
            className="cart-header-btn"
            title="Giỏ hàng"
          >
            <FaShoppingCart size={18} />
            {totalItemCount > 0 && (
              <span className="cart-badge-count">
                {totalItemCount > 99 ? "99+" : totalItemCount}
              </span>
            )}
          </Link>

          {/* User Authentication Status */}
          {!isLoggedIn ? (
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Link to="/auth/login">
                <Button variant="outline" size="sm">
                  Đăng nhập
                </Button>
              </Link>
              <Link to="/auth/register">
                <Button variant="primary" size="sm">
                  Đăng ký
                </Button>
              </Link>
            </div>
          ) : (
            <div className="profile-container" ref={profileRef}>
              <div
                className="profile-trigger"
                onClick={() => setShowProfileDropdown((v) => !v)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    setShowProfileDropdown((value) => !value);
                  }
                }}
                role="button"
                tabIndex={0}
                aria-expanded={showProfileDropdown}
                aria-haspopup="menu"
              >
                <FaUserCircle size={22} style={{ color: "var(--sd-primary)" }} />
                <span
                  style={{
                    fontSize: "var(--sd-font-size-xs)",
                    fontWeight: 600,
                    maxWidth: "100px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userProfile?.name?.split(" ")[0] || "Tài khoản"}
                </span>
                <FaChevronDown size={10} style={{ color: "var(--sd-text-muted)" }} />
              </div>

              <AnimatePresence>
                {showProfileDropdown && (
                  <motion.div
                    className="profile-dropdown-card"
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                  >
                    <div className="dropdown-user-header">
                      <p className="dropdown-user-name">
                        {userProfile?.name || "Tài khoản khách hàng"}
                      </p>
                      {userProfile?.email && (
                        <p className="dropdown-user-email">
                          {userProfile.email}
                        </p>
                      )}
                    </div>

                    <Link
                      to="/customer/profile"
                      className="header_dropdown-item"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <FaUserCircle size={15} /> Hồ sơ của tôi
                    </Link>
                    <Link
                      to="/orders"
                      className="header_dropdown-item"
                      onClick={() => setShowProfileDropdown(false)}
                    >
                      <FaReceipt size={15} /> Lịch sử đơn hàng
                    </Link>

                    <div style={{ height: "1px", backgroundColor: "var(--sd-border)", margin: "0.25rem 0" }} />

                    <button
                      type="button"
                      className="header_dropdown-item logout"
                      onClick={handleLogout}
                    >
                      <FaSignOutAlt size={15} /> Đăng xuất
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.header>

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setSidebarOpen(false)}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
      />
    </>
  );
}

export default Header;
