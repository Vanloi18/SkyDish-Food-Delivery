import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaTimes, 
  FaHome, 
  FaUtensils, 
  FaShoppingCart, 
  FaReceipt, 
  FaUser, 
  FaStore, 
  FaMotorcycle, 
  FaShieldAlt, 
  FaSignOutAlt, 
  FaSignInAlt,
  FaUserPlus,
  FaInfoCircle,
  FaEnvelope
} from "react-icons/fa";
import Button from "./common/Button";
import "../styles/sidebar.css";

function Sidebar({ isOpen, onClose, isLoggedIn, onLogout }) {
  const navigate = useNavigate();

  const handleOverlayClick = (e) => {
    if (e.target.classList.contains("sidebar-overlay")) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="sidebar-overlay"
          onClick={handleOverlayClick}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          <motion.div
            className="sidebar"
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "tween", duration: 0.25 }}
          >
            {/* Header */}
            <div className="sidebar-header">
              <Link to="/" className="logo-brand" onClick={onClose}>
                <div className="logo-icon-badge">
                  <FaUtensils size={16} />
                </div>
                <span>Sky</span>Dish
              </Link>
              <button
                type="button"
                className="sidebar-close-btn"
                onClick={onClose}
                title="Đóng menu"
              >
                <FaTimes size={14} />
              </button>
            </div>

            {/* Customer Navigation */}
            <p className="sidebar-section-title">Điều hướng</p>
            <div className="sidebar-nav-list">
              <Link to="/" className="sidebar-nav-item" onClick={onClose}>
                <FaHome style={{ color: "var(--sd-primary)" }} /> Trang chủ
              </Link>
              <Link to="/customer/home" className="sidebar-nav-item" onClick={onClose}>
                <FaUtensils style={{ color: "var(--sd-primary)" }} /> Khám phá nhà hàng
              </Link>
              <Link to="/customer/cart" className="sidebar-nav-item" onClick={onClose}>
                <FaShoppingCart style={{ color: "#ff9800" }} /> Giỏ hàng
              </Link>
              <Link to="/orders" className="sidebar-nav-item" onClick={onClose}>
                <FaReceipt style={{ color: "#3b82f6" }} /> Đơn hàng của tôi
              </Link>
              {isLoggedIn && (
                <Link to="/customer/profile" className="sidebar-nav-item" onClick={onClose}>
                  <FaUser style={{ color: "#10b981" }} /> Hồ sơ của tôi
                </Link>
              )}
            </div>

            {/* Partner & Admin Portals */}
            <p className="sidebar-section-title">Cổng đối tác & Quản trị</p>
            <div className="sidebar-nav-list">
              <Link to="/restaurant/home" className="sidebar-nav-item" onClick={onClose}>
                <FaStore style={{ color: "#3b82f6" }} /> Đối tác nhà hàng
              </Link>
              <Link to="/delivery/dashboard" className="sidebar-nav-item" onClick={onClose}>
                <FaMotorcycle style={{ color: "#10b981" }} /> Shipper
              </Link>
              <Link to="/superadmin/login" className="sidebar-nav-item" onClick={onClose}>
                <FaShieldAlt style={{ color: "#8b5cf6" }} /> Quản trị viên
              </Link>
            </div>

            {/* About & Support */}
            <p className="sidebar-section-title">Trợ giúp & Thông tin</p>
            <div className="sidebar-nav-list">
              <Link to="/about" className="sidebar-nav-item" onClick={onClose}>
                <FaInfoCircle style={{ color: "var(--sd-text-muted)" }} /> Về chúng tôi
              </Link>
              <Link to="/contact" className="sidebar-nav-item" onClick={onClose}>
                <FaEnvelope style={{ color: "var(--sd-text-muted)" }} /> Liên hệ & Góp ý
              </Link>
            </div>

            {/* Footer Action / Authentication */}
            <div className="sidebar-footer-actions">
              {isLoggedIn ? (
                <Button
                  variant="danger"
                  fullWidth
                  icon={FaSignOutAlt}
                  onClick={() => {
                    onLogout();
                    onClose();
                  }}
                >
                  Đăng xuất
                </Button>
              ) : (
                <>
                  <Button
                    variant="primary"
                    fullWidth
                    icon={FaSignInAlt}
                    onClick={() => {
                      onClose();
                      navigate("/auth/login");
                    }}
                  >
                    Đăng nhập
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    icon={FaUserPlus}
                    onClick={() => {
                      onClose();
                      navigate("/auth/register");
                    }}
                  >
                    Tạo tài khoản
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default Sidebar;
