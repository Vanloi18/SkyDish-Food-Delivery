import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaEnvelope,
  FaUtensils,
  FaExclamationCircle,
  FaArrowLeft,
  FaPaperPlane,
} from "react-icons/fa";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      const res = await axios.post(
        "http://localhost:4000/api/auth/forgot-password",
        {
          email: normalizedEmail,
        }
      );

      if (res.data?.status === "success") {
        // Lưu email để dùng ở bước Verify OTP
        sessionStorage.setItem(
          "resetPasswordEmail",
          normalizedEmail
        );

        navigate("/auth/verify-otp");
      } else {
        setError(
          res.data?.message ||
            "Không thể gửi OTP. Vui lòng thử lại."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể gửi OTP. Vui lòng kiểm tra kết nối và thử lại."
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
          <div className="auth-header">
            <div className="auth-brand-badge">
              <FaUtensils size={24} />
            </div>

            <h2 className="auth-title">
              Quên mật khẩu?
            </h2>

            <p className="auth-subtitle">
              Nhập email đã đăng ký. Chúng tôi sẽ gửi mã OTP
              để bạn đặt lại mật khẩu.
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
              label="Địa chỉ Email"
              name="email"
              type="email"
              placeholder="ten@example.com"
              icon={FaEnvelope}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError("");
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

          <div
            style={{
              marginTop: "1.5rem",
              textAlign: "center",
            }}
          >
            <Link
              to="/auth/login"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaArrowLeft size={13} />
              Quay lại đăng nhập
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}

