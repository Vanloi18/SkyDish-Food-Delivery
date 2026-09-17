import { API_URLS } from '../../config/api';
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FaEnvelope, FaLock, FaUtensils, FaExclamationCircle, FaSignInAlt, FaInfoCircle } from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function AuthLogin() {
  const [credentials, setCredentials] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const noticeMessage = searchParams.get("message");

  const handleChange = (e) => {
    setCredentials((c) => ({ ...c, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(`${API_URLS.AUTH}/api/auth/login`, credentials);
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        const customer = res.data.data?.customer || res.data.customer;
        if (customer?.firstName) {
          localStorage.setItem("customerName", `${customer.firstName} ${customer.lastName || ""}`.trim());
        }
        if (customer?.phone) {
          localStorage.setItem("customerPhone", customer.phone);
        }
        if (customer?.id || customer?._id) {
          localStorage.setItem("customerId", customer.id || customer._id);
        }
        if (credentials.email) {
          localStorage.setItem("customerEmail", credentials.email);
        }
        const redirectTarget = searchParams.get("redirect") || "/customer/home";
        navigate(redirectTarget);
      } else {
        setError("Phản hồi không hợp lệ từ máy chủ xác thực.");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu."
      );
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
            <div className="auth-brand-badge">
              <FaUtensils size={24} />
            </div>
            <h2 className="auth-title">Chào mừng trở lại</h2>
            <p className="auth-subtitle">
              Đăng nhập để theo dõi đơn hàng, lưu món yêu thích và giao hàng nhanh
            </p>
          </div>

          {noticeMessage && (
            <motion.div
              className="auth-notice-banner"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.75rem",
                backgroundColor: "#eff6ff",
                border: "1px solid #bfdbfe",
                color: "#1d4ed8",
                padding: "0.75rem 1rem",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                fontSize: "0.9rem",
                fontWeight: "500"
              }}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <FaInfoCircle size={18} />
              <span>{noticeMessage}</span>
            </motion.div>
          )}

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
              label="Địa chỉ Email"
              name="email"
              type="email"
              placeholder="ten@example.com"
              icon={FaEnvelope}
              value={credentials.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              placeholder="••••••••"
              icon={FaLock}
              value={credentials.password}
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
              >
                Đăng nhập
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Chưa có tài khoản SkyDish?{" "}
            <Link to="/auth/register">Đăng ký ngay</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
