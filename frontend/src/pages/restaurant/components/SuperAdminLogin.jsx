import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaShieldAlt, FaEnvelope, FaLock, FaSignInAlt, FaExclamationCircle } from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import "../../../styles/auth.css";

function SuperAdminLogin() {
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
      setError("Vui lòng nhập đầy đủ email và mật khẩu quản trị.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch("http://localhost:5002/api/superAdmin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem("token", data.token);
        if (data.name) localStorage.setItem("superAdminName", data.name);
        navigate("/superadmin/dashboard");
      } else {
        setError(data.message || "Thông tin quản trị viên không chính xác.");
      }
    } catch (err) {
      console.error("Super Admin login error:", err);
      setError("Lỗi kết nối đến máy chủ quản trị trên cổng 5002.");
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
            <div className="auth-brand-badge" style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", color: "var(--sd-primary)" }}>
              <FaShieldAlt size={24} />
            </div>
            <h2 className="auth-title">Cổng Quản trị viên (Super Admin)</h2>
            <p className="auth-subtitle">
              Xác thực bảo mật dành cho ban điều hành và giám sát hệ thống nền tảng SkyDish
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
              label="Email Quản trị"
              name="email"
              type="email"
              placeholder="superadmin@skydish.com"
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
                style={{ backgroundColor: "var(--admin-primary)", borderColor: "var(--admin-primary)" }}
              >
                Đăng nhập Bảng điều khiển Quản trị
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Cần tạo tài khoản Quản trị mới?{" "}
            <Link to="/superadmin/register">Đăng ký Quản trị viên</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

export default SuperAdminLogin;
