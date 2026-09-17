import { API_URLS } from '../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { 
  FaMotorcycle, 
  FaUser, 
  FaEnvelope, 
  FaPhone, 
  FaLock, 
  FaIdCard, 
  FaCheckCircle, 
  FaExclamationCircle 
} from "react-icons/fa";
import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function DriverRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    vehicleType: "bike",
    vehicleNumber: "",
    location: { type: "Point", coordinates: [79.8612, 6.9271] },
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password || !form.phone || !form.vehicleNumber) {
      setError("Vui lòng điền đầy đủ các thông tin đối tác giao hàng.");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const res = await axios.post(`${API_URLS.DELIVERY}/api/delivery/auth/register`, form);
      if (res.data?.success) {
        setSuccessMsg("Đăng ký đối tác Shipper thành công! Đang chuyển hướng đến trang đăng nhập...");
        setTimeout(() => {
          navigate("/delivery/login");
        }, 1500);
      } else {
        setError(res.data?.message || "Đăng ký thất bại.");
      }
    } catch (err) {
      console.error("Driver registration error:", err);
      setError(
        (err.response?.data?.errors && Object.values(err.response.data.errors)[0]) ||
        err.response?.data?.message ||
        "Lỗi đăng ký với Dịch vụ Giao hàng."
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
            <div className="auth-brand-badge" style={{ background: "linear-gradient(135deg, #10b981 0%, #34d399 100%)" }}>
              <FaMotorcycle size={24} />
            </div>
            <h2 className="auth-title">Đăng ký Đối tác Shipper</h2>
            <p className="auth-subtitle">
              Gia nhập đội ngũ tài xế SkyDish và gia tăng thu nhập với lịch trình linh hoạt
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
            <div className="auth-form-grid">
              <Input
                label="Họ và Tên"
                name="name"
                placeholder="Ví dụ: Nguyễn Văn Shipper"
                icon={FaUser}
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Số điện thoại"
                name="phone"
                placeholder="0901234567"
                icon={FaPhone}
                value={form.phone}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Địa chỉ Email"
              name="email"
              type="email"
              placeholder="shipper@example.com"
              icon={FaEnvelope}
              value={form.email}
              onChange={handleChange}
              required
            />

            <div className="auth-form-grid">
              <div style={{ marginBottom: "1.25rem" }}>
                <label style={{ display: "block", marginBottom: "0.4rem", fontSize: "var(--sd-font-size-sm)", fontWeight: "600" }}>
                  Loại phương tiện
                </label>
                <select
                  name="vehicleType"
                  value={form.vehicleType}
                  onChange={handleChange}
                  style={{
                    width: "100%",
                    padding: "0.65rem 1rem",
                    borderRadius: "var(--sd-radius-md)",
                    border: "1px solid var(--sd-border)",
                    fontSize: "var(--sd-font-size-sm)",
                    outline: "none",
                  }}
                >
                  <option value="bike">Xe máy / Mô tô</option>
                  <option value="car">Ô tô / Xe bán tải</option>
                  <option value="truck">Xe tải</option>
                </select>
              </div>

              <Input
                label="Biển số xe"
                name="vehicleNumber"
                placeholder="Ví dụ: 29A-12345"
                icon={FaIdCard}
                value={form.vehicleNumber}
                onChange={handleChange}
                required
              />
            </div>

            <Input
              label="Mật khẩu"
              name="password"
              type="password"
              placeholder="Tối thiểu 8 ký tự"
              minLength={8}
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
                icon={FaMotorcycle}
                style={{ backgroundColor: "#10b981" }}
              >
                Đăng ký Đối tác Shipper
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Đã có tài khoản Shipper? <Link to="/delivery/login">Đăng nhập tại đây</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}
