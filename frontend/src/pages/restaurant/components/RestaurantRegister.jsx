import { API_URLS } from '../../../config/api';
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { 
  FaStore, 
  FaUser, 
  FaMapMarkerAlt, 
  FaPhone, 
  FaEnvelope, 
  FaLock, 
  FaCheckCircle,
  FaExclamationCircle 
} from "react-icons/fa";
import Header from "../../../components/Header";
import Footer from "../../../components/Footer";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import ImageUploadPreview from "../../../components/common/ImageUploadPreview";
import "../../../styles/auth.css";

function RestaurantRegister() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    ownerName: "",
    location: "",
    contactNumber: "",
    email: "",
    password: "",
    profilePicture: null,
  });

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.ownerName || !form.location || !form.contactNumber || !form.email || !form.password) {
      setError("Vui lòng điền đầy đủ các thông tin nhà hàng bắt buộc.");
      return;
    }
    if (!/^\+?[0-9]{9,15}$/.test(form.contactNumber.trim())) {
      setError("Số điện thoại phải gồm 9-15 chữ số.");
      return;
    }
    if (form.password.length < 8) {
      setError("Mật khẩu phải có ít nhất 8 ký tự.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("name", form.name);
      formData.append("ownerName", form.ownerName);
      formData.append("location", form.location);
      formData.append("contactNumber", form.contactNumber);
      formData.append("email", form.email);
      formData.append("password", form.password);
      if (form.profilePicture) {
        formData.append("profilePicture", form.profilePicture);
      }

      const res = await fetch(`${API_URLS.RESTAURANT}/api/restaurant/register`, {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok) {
        setSuccessMsg("Đăng ký nhà hàng thành công! Đang chuyển hướng đến trang đăng nhập...");
        setTimeout(() => {
          navigate("/restaurant/login");
        }, 1500);
      } else {
        setError(data.message || "Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.");
      }
    } catch (err) {
      console.error("Registration error:", err);
      setError("Lỗi kết nối với Dịch vụ Nhà hàng.");
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
          style={{ maxWidth: "580px" }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="auth-header">
            <div className="auth-brand-badge" style={{ background: "linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%)" }}>
              <FaStore size={24} />
            </div>
            <h2 className="auth-title">Hợp tác cùng SkyDish</h2>
            <p className="auth-subtitle">
              Đăng ký gian hàng nhà hàng và tiếp cận hàng ngàn thực khách mỗi ngày
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
                label="Tên nhà hàng"
                name="name"
                placeholder="Ví dụ: Sky Gourmet Hub"
                icon={FaStore}
                value={form.name}
                onChange={handleChange}
                required
              />
              <Input
                label="Họ tên chủ nhà hàng"
                name="ownerName"
                placeholder="Ví dụ: Nguyễn Văn A"
                icon={FaUser}
                value={form.ownerName}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-form-grid">
              <Input
                label="Địa chỉ nhà hàng"
                name="location"
                placeholder="Ví dụ: 45 Đường Ẩm Thực, Quận 1"
                icon={FaMapMarkerAlt}
                value={form.location}
                onChange={handleChange}
                required
              />
              <Input
                label="Số điện thoại liên hệ"
                name="contactNumber"
                placeholder="0901234567"
                icon={FaPhone}
                value={form.contactNumber}
                onChange={handleChange}
                required
              />
            </div>

            <div className="auth-form-grid">
              <Input
                label="Email kinh doanh"
                name="email"
                type="email"
                placeholder="chucuahang@restaurant.com"
                icon={FaEnvelope}
                value={form.email}
                onChange={handleChange}
                required
              />
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
            </div>

            {/* Profile Picture Upload */}
            <div style={{ marginBottom: "1.5rem" }}>
              <ImageUploadPreview
                label="Ảnh bìa / Logo nhà hàng"
                hint="Chọn ảnh logo hoặc biển hiệu nhà hàng (.jpg, .png)"
                value={form.profilePicture}
                type="restaurant"
                height="160px"
                onChange={(file) => {
                  setForm({ ...form, profilePicture: file });
                }}
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={FaStore}
                style={{ backgroundColor: "#3b82f6" }}
              >
                Đăng ký Nhà hàng
              </Button>
            </div>
          </form>

          <div className="auth-footer-prompt">
            Đã đăng ký tài khoản? <Link to="/restaurant/login">Đăng nhập tại đây</Link>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
}

export default RestaurantRegister;
