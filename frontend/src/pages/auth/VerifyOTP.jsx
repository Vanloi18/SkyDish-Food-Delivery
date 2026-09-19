import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaKey,
  FaUtensils,
  FaExclamationCircle,
  FaArrowLeft,
  FaCheck,
} from "react-icons/fa";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const email = sessionStorage.getItem(
    "resetPasswordEmail"
  );

  const handleOTPChange = (e) => {
    const value = e.target.value.replace(/\D/g, "");

    if (value.length <= 6) {
      setOtp(value);
    }

    if (error) {
      setError("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email) {
      setError(
        "Không tìm thấy email. Vui lòng yêu cầu mã OTP lại."
      );
      return;
    }

    if (otp.length !== 6) {
      setError("Vui lòng nhập đầy đủ 6 số OTP.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/verify-otp",
        {
          email,
          otp,
        }
      );

      if (res.data?.status === "success") {
        // Lưu trạng thái OTP đã xác nhận
        sessionStorage.setItem(
          "resetPasswordOTP",
          otp
        );

        navigate("/auth/reset-password");
      } else {
        setError(
          res.data?.message ||
            "OTP không hợp lệ."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "OTP không hợp lệ hoặc đã hết hạn."
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
              Xác nhận OTP
            </h2>

            <p className="auth-subtitle">
              Nhập mã OTP 6 số đã được gửi đến email
            </p>

            <p
              style={{
                fontWeight: 600,
                marginTop: "0.5rem",
                wordBreak: "break-word",
              }}
            >
              {email || "Email không xác định"}
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
              label="Mã OTP"
              name="otp"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="Nhập 6 số OTP"
              icon={FaKey}
              value={otp}
              onChange={handleOTPChange}
              required
            />

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={FaCheck}
              >
                Xác nhận OTP
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
              to="/auth/forgot-password"
              style={{
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <FaArrowLeft size={13} />
              Nhập lại email
            </Link>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
