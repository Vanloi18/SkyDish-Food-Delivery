import React, { useState } from "react";
import { Link } from "react-router-dom";
import { 
  FaUtensils, 
  FaFacebookF, 
  FaTwitter, 
  FaInstagram, 
  FaLinkedinIn, 
  FaPaperPlane,
  FaShieldAlt,
  FaLeaf
} from "react-icons/fa";
import Button from "./common/Button";
import "../styles/footer.css";

function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
      setTimeout(() => setSubscribed(false), 4000);
    }
  };

  return (
    <footer className="home-footer">
      <div className="sd-container">
        <div className="footer-grid">
          {/* Brand Column */}
          <div className="footer-brand-col">
            <Link to="/" className="footer-brand-title">
              <div className="logo-icon-badge">
                <FaUtensils size={18} />
              </div>
              <span>Sky</span>Dish
            </Link>
            <p className="footer-description">
              Nền tảng giao đồ ăn thông minh thế hệ mới. Món ăn nóng hổi, thơm ngon được giao tận cửa với tốc độ nhanh chóng.
            </p>
            <div className="footer-social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Facebook">
                <FaFacebookF size={14} />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Twitter">
                <FaTwitter size={14} />
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="Instagram">
                <FaInstagram size={14} />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noopener noreferrer" className="footer-social-btn" aria-label="LinkedIn">
                <FaLinkedinIn size={14} />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="footer-col-title">Điều hướng</h4>
            <ul className="footer-links-list">
              <li><Link to="/" className="footer-link-item">Trang chủ</Link></li>
              <li><Link to="/customer/home" className="footer-link-item">Khám phá nhà hàng</Link></li>
              <li><Link to="/orders" className="footer-link-item">Theo dõi đơn hàng</Link></li>
              <li><Link to="/about" className="footer-link-item">Về chúng tôi</Link></li>
              <li><Link to="/contact" className="footer-link-item">Liên hệ & Góp ý</Link></li>
            </ul>
          </div>

          {/* Role Portals */}
          <div>
            <h4 className="footer-col-title">Cổng đối tác</h4>
            <ul className="footer-links-list">
              <li><Link to="/auth/login" className="footer-link-item">Đăng nhập khách hàng</Link></li>
              <li><Link to="/restaurant/home" className="footer-link-item">Đối tác nhà hàng</Link></li>
              <li><Link to="/delivery/dashboard" className="footer-link-item">Shipper</Link></li>
              <li><Link to="/superadmin/login" className="footer-link-item">Quản trị viên</Link></li>
              <li><Link to="/privacy" className="footer-link-item">Chính sách bảo mật</Link></li>
            </ul>
          </div>

          {/* Newsletter Subscription */}
          <div>
            <h4 className="footer-col-title">Cập nhật thông tin</h4>
            <p className="footer-description" style={{ marginBottom: "1rem" }}>
              Nhận ưu đãi hàng tuần, mã giảm giá độc quyền và thực đơn mới nhất.
            </p>
            {subscribed ? (
              <div
                style={{
                  padding: "0.75rem 1rem",
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  border: "1px solid #10b981",
                  borderRadius: "var(--sd-radius-md)",
                  color: "#10b981",
                  fontSize: "var(--sd-font-size-sm)",
                  fontWeight: "600",
                }}
              >
                🎉 Cảm ơn bạn đã đăng ký nhận tin!
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="footer-newsletter-form">
                <div className="footer-newsletter-input-group">
                  <input
                    type="email"
                    placeholder="Địa chỉ email của bạn"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="footer-newsletter-input"
                  />
                  <Button type="submit" variant="primary" icon={FaPaperPlane}>
                    Gửi
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="footer-bottom-bar">
          <p>© {new Date().getFullYear()} Nền tảng giao đồ ăn SkyDish. Phát triển với kiến trúc Microservices.</p>
          <div className="footer-badges">
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <FaShieldAlt style={{ color: "var(--sd-success)" }} /> Thanh toán bảo mật SSL
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
              <FaLeaf style={{ color: "var(--sd-success)" }} /> Giao hàng thân thiện môi trường
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;