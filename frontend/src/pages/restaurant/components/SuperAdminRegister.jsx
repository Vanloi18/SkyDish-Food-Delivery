import { API_URLS } from '../../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { FaShieldAlt, FaUser, FaEnvelope, FaLock, FaUserPlus, FaCheckCircle, FaExclamationCircle } from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import "../../../styles/auth.css";

function SuperAdminRegister() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      setError("Vui lòng điền đầy đủ các thông tin đăng ký quản trị.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await fetch(`${API_URLS.RESTAURANT}/api/superAdmin/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Đăng ký tài khoản Quản trị viên thành công! Đang chuyển hướng đến trang đăng nhập...");
        setTimeout(() => {
          navigate("/superadmin/login");
        }, 1500);
      } else {
        setError(data.message || "Đăng ký thất bại.");
      }
    } catch (err) {
      console.error("Super Admin registration error:", err);
      setError("Lỗi kết nối với Dịch vụ Quản trị.");
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
            <h2 className="auth-title">Đăng ký Quản trị viên (Super Admin)</h2>
            <p className="auth-subtitle">
              Tạo tài khoản quản trị và giám sát hệ thống nền tảng SkyDish
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

          {successMsg && (
            <div
              style={{
                backgroundColor: "var(--sd-success-light)",
                border: "1px solid rgba(16, 185, 129, 0.3)",
                color: "var(--sd-success-hover)",
                padding: "0.85rem 1rem",
                borderRadius: "var(--sd-radius-md)",
                fontSize: "var(--sd-font-size-sm)",
                fontWeight: "600",
                marginBottom: "1.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaCheckCircle /> {successMsg}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <Input
              label="Họ tên Quản trị viên"
              name="name"
              placeholder="Ví dụ: Quản trị Trưởng"
              icon={FaUser}
              value={form.name}
              onChange={handleChange}
              required
            />

            <Input
              label="Địa chỉ Email Quản trị"
              name="email"
              type="email"
              placeholder="admin@skydish.com"
              icon={FaEnvelope}
              value={form.email}
              onChange={handleChange}
              required
            />

            <Input
              label="Mật khẩu bảo mật"
              name="password"
              type="password"
              placeholder="Tối thiểu 6 ký tự"
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
                icon={FaUserPlus}
                style={{ backgroundColor: "var(--admin-primary)", borderColor: "var(--admin-primary)" }}
              >
                Đăng ký tài khoản Quản trị
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Đã có tài khoản Quản trị? <Link to="/superadmin/login">Đăng nhập tại đây</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

export default SuperAdminRegister;
