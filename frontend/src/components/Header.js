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
  FaBell
} from "react-icons/fa";
import { CartContext } from "../pages/contexts/CartContext";
import Sidebar from "./Sidebar";
import Button from "./common/Button";
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

  const { totalItemCount } = useContext(CartContext) || { totalItemCount: 0 };
  const navigate = useNavigate();
  const location = useLocation();

  const profileRef = useRef();
  const portalsRef = useRef();
  const notifRef = useRef();

  const fetchNotifications = useCallback(async () => {
    try {
      const custId = localStorage.getItem("customerId") || localStorage.getItem("customerEmail") || "customer";
      const res = await fetch(`http://localhost:5002/api/notifications?userId=${custId}&role=customer`);
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
      await fetch("http://localhost:5002/api/notifications/read-all", {
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
      await fetch(`http://localhost:5002/api/notifications/${notifId}/read`, { method: "PUT" });
      setNotifications((prev) => prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n)));
      setUnreadNotifCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.warn("Error marking read:", e);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    setLoggedIn(!!token);

    if (token) {
      const cachedName = localStorage.getItem("customerName") || "Khách hàng";
      const cachedEmail = localStorage.getItem("customerEmail") || "";
      setUserProfile({ name: cachedName, email: cachedEmail });
      fetchNotifications();
    } else {
      setUserProfile(null);
      setNotifications([]);
      setUnreadNotifCount(0);
    }
  }, [location.pathname, fetchNotifications]);

  // Click outside listener for dropdowns
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
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("customerName");
    localStorage.removeItem("customerEmail");
    setLoggedIn(false);
    setShowProfileDropdown(false);
    navigate("/auth/login");
  };

  const isActive = (path) => location.pathname === path;

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
            title="Mở menu điều hướng"
            role="button"
            tabIndex={0}
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
        </div>

        <div className="header-right">
          {/* Portals Switcher */}
          <div className="portals-dropdown-container" ref={portalsRef}>
            <button
              type="button"
              className="portals-trigger-btn"
              onClick={() => setShowPortalsDropdown((v) => !v)}
            >
              Cổng đối tác <FaChevronDown size={10} />
            </button>

            <AnimatePresence>
              {showPortalsDropdown && (
                <motion.div
                  className="profile-dropdown-card"
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
                  style={{ width: "230px" }}
                >
                  <Link
                    to="/customer/home"
                    className="header_dropdown-item"
                    onClick={() => setShowPortalsDropdown(false)}
                  >
                    <FaUtensils style={{ color: "var(--sd-primary)" }} /> Khách hàng
                  </Link>
                  <Link
                    to="/restaurant/home"
                    className="header_dropdown-item"
                    onClick={() => setShowPortalsDropdown(false)}
                  >
                    <FaStore style={{ color: "#3b82f6" }} /> Đối tác nhà hàng
                  </Link>
                  <Link
                    to="/delivery/dashboard"
                    className="header_dropdown-item"
                    onClick={() => setShowPortalsDropdown(false)}
                  >
                    <FaMotorcycle style={{ color: "#10b981" }} /> Shipper
                  </Link>
                  <Link
                    to="/superadmin/login"
                    className="header_dropdown-item"
                    onClick={() => setShowPortalsDropdown(false)}
                  >
                    <FaShieldAlt style={{ color: "#8b5cf6" }} /> Quản trị viên
                  </Link>
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
                  initial={{ opacity: 0, y: 8, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.95 }}
                  transition={{ duration: 0.15 }}
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
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
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
