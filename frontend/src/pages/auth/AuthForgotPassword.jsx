import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaEnvelope,
  FaUtensils,
  FaArrowLeft,
  FaPaperPlane,
  FaExclamationCircle,
} from "react-icons/fa";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function AuthForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      await axios.post(
        "http://localhost:4000/api/auth/forgot-password",
        {
          email: email.trim().toLowerCase(),
        }
      );

      // Lưu email để trang OTP sử dụng
      localStorage.setItem(
        "resetPasswordEmail",
        email.trim().toLowerCase()
      );

      // Chuyển sang trang nhập OTP
      navigate("/auth/verify-otp");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể gửi mã OTP. Vui lòng thử lại."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <Header />

      <main className="auth-page-wrapper">
        <motion.div
          className="auth-card-container"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Header */}
          <div className="auth-header">
            <div className="auth-brand-badge">
              <FaUtensils size={24} />
            </div>

            <h2 className="auth-title">
              Quên mật khẩu?
            </h2>

            <p className="auth-subtitle">
              Nhập địa chỉ email của bạn và chúng tôi sẽ gửi
              mã OTP để đặt lại mật khẩu.
            </p>
          </div>

          {/* Error */}
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

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <Input
              label="Địa chỉ Email"
              name="email"
              type="email"
              placeholder="ten@example.com"
              icon={FaEnvelope}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);

                if (error) {
                  setError("");
                }
              }}
              required
            />

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={FaPaperPlane}
              >
                Gửi mã OTP
              </Button>
            </div>
          </form>

          {/* Back to login */}
          <div
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
            }}
          >
            <Link
              to="/auth/login"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                textDecoration: "none",
                fontWeight: 500,
              }}
            >
              <FaArrowLeft size={14} />
              Quay lại đăng nhập
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
