import { API_URLS } from '../../config/api';
import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaLock, 
  FaMapMarkerAlt, 
  FaUserPlus, 
  FaExclamationCircle 
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function AuthRegister() {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
    location: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const handleChange = (e) => {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URLS.AUTH}/api/auth/register/customer`,
        form
      );
      if (res.data?.token) {
        localStorage.setItem("token", res.data.token);
        localStorage.setItem("customerName", `${form.firstName} ${form.lastName}`.trim());
        localStorage.setItem("customerEmail", form.email);
        const searchParams = new URLSearchParams(location.search);
        const redirectTarget = searchParams.get("redirect") || "/customer/home";
        navigate(redirectTarget);
      } else {
        navigate("/auth/login");
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
        err.response?.data?.errors?.[0] ||
        "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin và thử lại."
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
          style={{ maxWidth: "560px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="auth-header">
            <div className="auth-brand-badge">
              <FaUserPlus size={24} />
            </div>
            <h2 className="auth-title">Tạo tài khoản mới</h2>
            <p className="auth-subtitle">
              Tham gia SkyDish để đặt món từ các nhà hàng hàng đầu và nhận hàng nhanh chóng
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
            <div className="auth-form-grid">
              <Input
                label="Họ & Tên đệm"
                name="firstName"
                placeholder="Nguyễn"
                icon={FaUser}
                value={form.firstName}
                onChange={handleChange}
                required
              />
              <Input
                label="Tên"
                name="lastName"
                placeholder="Văn A"
                icon={FaUser}
                value={form.lastName}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Địa chỉ Email"
              name="email"
              type="email"
              placeholder="nguyenvana@example.com"
              icon={FaEnvelope}
              value={form.email}
              onChange={handleChange}
              required
            />

            <div className="auth-form-grid">
              <Input
                label="Số điện thoại"
                name="phone"
                placeholder="0901234567"
                icon={FaPhone}
                value={form.phone}
                onChange={handleChange}
                required
              />
              <Input
                label="Địa chỉ giao hàng"
                name="location"
                placeholder="Quận 1, TP. Hồ Chí Minh"
                icon={FaMapMarkerAlt}
                value={form.location}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Mật khẩu"
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
              >
                Tạo tài khoản
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Đã có tài khoản? <Link to="/auth/login">Đăng nhập tại đây</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
