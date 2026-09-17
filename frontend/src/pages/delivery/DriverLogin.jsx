import { API_URLS } from '../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { FaMotorcycle, FaEnvelope, FaLock, FaSignInAlt, FaExclamationCircle } from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function DriverLogin() {
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
      const res = await axios.post(`${API_URLS.DELIVERY}/api/delivery/auth/login`, form);
      if (res.data?.success && res.data?.token) {
        localStorage.setItem("driverToken", res.data.token);
        if (res.data.data?.id) {
          localStorage.setItem("driverId", res.data.data.id);
        }
        navigate("/delivery/dashboard");
      } else {
        setError(res.data?.message || "Thông tin đăng nhập shipper không chính xác.");
      }
    } catch (err) {
      console.error("Driver login error:", err);
      setError(
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        err.response?.data?.message ||
        "Không thể kết nối đến Dịch vụ Giao hàng. Vui lòng kiểm tra lại."
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
            <div className="auth-brand-badge" style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }}>
              <FaMotorcycle size={24} />
            </div>
            <h2 className="auth-title">Cổng Đối tác Shipper</h2>
            <p className="auth-subtitle">
              Đăng nhập để nhận các đơn giao hàng và quản lý lộ trình giao cho khách
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
              label="Địa chỉ Email Shipper"
              name="email"
              type="email"
              placeholder="shipper@skydish.com"
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
                style={{ backgroundColor: "#10b981" }}
              >
                Đăng nhập Shipper
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Muốn đồng hành giao hàng cùng SkyDish?{" "}
            <Link to="/delivery/register">Đăng ký tài khoản Shipper</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
