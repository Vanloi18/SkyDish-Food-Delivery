import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaStore, FaEnvelope, FaLock, FaSignInAlt, FaExclamationCircle } from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import "../../../styles/auth.css";

function RestaurantLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError("Vui lòng nhập đầy đủ email và mật khẩu.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5002/api/restaurant/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("restaurantToken", data.token);
        navigate("/restaurant/dashboard");
      } else {
        setError(data.message || "Thông tin đăng nhập nhà hàng không chính xác.");
      }
    } catch (err) {
      console.error("Restaurant login error:", err);
      setError("Lỗi kết nối máy chủ. Vui lòng kiểm tra lại dịch vụ nhà hàng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <Header />
      <main className="auth-page-wrapper">
        <motion.div
          className="auth-card-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="auth-header">
            <div className="auth-brand-badge" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" }}>
              <FaStore size={24} />
            </div>
            <h2 className="auth-title">Cổng Quản lý Nhà hàng</h2>
            <p className="auth-subtitle">
              Đăng nhập để quản lý món ăn, thời gian mở cửa và theo dõi đơn đặt món
            </p>
          </div>

          {error && (
            <motion.div
              className="auth-error-banner"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FaExclamationCircle size={18} />
              <span>{error}</span>
            </motion.div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Địa chỉ Email Nhà hàng"
              name="email"
              type="email"
              placeholder="nhahang@skydish.com"
              icon={FaEnvelope}
              value={form.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              placeholder="••••••••"
              icon={FaLock}
              value={form.password}
              onChange={handleChange}
              required
            />

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={FaSignInAlt}
                style={{ backgroundColor: "#3b82f6" }}
              >
                Đăng nhập vào Bảng điều khiển
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Muốn trở thành đối tác của SkyDish?{" "}
            <Link to="/restaurant/register">Đăng ký nhà hàng của bạn</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

export default RestaurantLogin;
