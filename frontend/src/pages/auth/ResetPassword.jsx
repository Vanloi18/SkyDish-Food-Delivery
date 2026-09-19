import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import {
  FaLock,
  FaUtensils,
  FaExclamationCircle,
  FaCheck,
  FaArrowLeft,
} from "react-icons/fa";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";
import "../../styles/auth.css";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const email = sessionStorage.getItem("resetPasswordEmail");
  const otp = sessionStorage.getItem("resetPasswordOTP");

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");

    if (!email || !otp) {
      setError("Phiên đặt lại mật khẩu không hợp lệ. Vui lòng thực hiện lại.");
      return;
    }

    if (password.length < 6) {
      setError("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Mật khẩu xác nhận không khớp.");
      return;
    }

    setLoading(true);

    try {
      const res = await axios.post(
        "http://localhost:4000/api/auth/reset-password",
        {
          email,
          otp,
          newPassword: password,
        }
      );

      if (res.data?.status === "success") {
        sessionStorage.removeItem("resetPasswordEmail");
        sessionStorage.removeItem("resetPasswordOTP");

        alert("Đặt lại mật khẩu thành công!");

        navigate("/auth/login");
      } else {
        setError(
          res.data?.message ||
            "Không thể đặt lại mật khẩu. Vui lòng thử lại."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Không thể đặt lại mật khẩu. Vui lòng thử lại."
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
              Đặt lại mật khẩu
            </h2>

            <p className="auth-subtitle">
              Nhập mật khẩu mới cho tài khoản của bạn.
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
              label="Mật khẩu mới"
              name="password"
              type="password"
              placeholder="Nhập mật khẩu mới"
              icon={FaLock}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError("");
              }}
              required
            />

            <div style={{ marginTop: "1rem" }}>
              <Input
                label="Xác nhận mật khẩu"
                name="confirmPassword"
                type="password"
                placeholder="Nhập lại mật khẩu mới"
                icon={FaLock}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (error) setError("");
                }}
                required
              />
            </div>

            <div style={{ marginTop: "1.5rem" }}>
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                icon={FaCheck}
              >
                Đặt lại mật khẩu
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