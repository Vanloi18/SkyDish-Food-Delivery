import React, { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { motion } from "framer-motion";
import axios from "axios";
import { API_URLS } from "../../config/api";
import {
  GoogleOAuthProvider,
  GoogleLogin,
} from "@react-oauth/google";

import {
  FaEnvelope,
  FaLock,
  FaUtensils,
  FaExclamationCircle,
  FaSignInAlt,
  FaInfoCircle,
} from "react-icons/fa";

import Header from "../../components/Header";
import Footer from "../../components/Footer";
import Input from "../../components/common/Input";
import Button from "../../components/common/Button";

export default function AuthLogin() {
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const noticeMessage = searchParams.get("message");

  const handleChange = (e) => {
    setCredentials((current) => ({
      ...current,
      [e.target.name]: e.target.value,
    }));

    if (error) {
      setError("");
    }
  };
   const handleGoogleLogin = async (credentialResponse) => {
  setError("");
  setLoading(true);

  try {
    const res = await axios.post(
      `${API_URLS.AUTH}/api/auth/google`,
      {
        credential: credentialResponse.credential,
      }
    );

    if (res.data?.token) {
      // Lưu JWT
      localStorage.setItem("token", res.data.token);

      const customer =
        res.data?.data?.customer ||
        res.data?.customer;

      // Lưu tên
      if (customer?.firstName) {
        localStorage.setItem(
          "customerName",
          `${customer.firstName} ${
            customer.lastName || ""
          }`.trim()
        );
      }

      // Lưu phone
      if (customer?.phone) {
        localStorage.setItem(
          "customerPhone",
          customer.phone
        );
      }

      // Lưu customer ID
      if (customer?.id || customer?._id) {
        localStorage.setItem(
          "customerId",
          customer.id || customer._id
        );
      }

      // Lưu email
      if (customer?.email) {
        localStorage.setItem(
          "customerEmail",
          customer.email.trim().toLowerCase()
        );
      }

      // Redirect giống login thường
      const redirectTarget =
        searchParams.get("redirect") ||
        "/customer/home";

      navigate(redirectTarget);
    } else {
      setError(
        "Phản hồi không hợp lệ từ máy chủ xác thực."
      );
    }
  } catch (err) {
    console.error("Google login error:", err);

    setError(
      err.response?.data?.message ||
        "Đăng nhập bằng Google thất bại. Vui lòng thử lại."
    );
  } finally {
    setLoading(false);
  }
};

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      const res = await axios.post(
        `${API_URLS.AUTH}/api/auth/login`,
        credentials
      );

      if (res.data?.token) {
        // Lưu JWT
        localStorage.setItem("token", res.data.token);

        // Backend trả customer trong data.customer
        const customer =
          res.data?.data?.customer ||
          res.data?.customer;

        // Lưu tên customer
        if (customer?.firstName) {
          localStorage.setItem(
            "customerName",
            `${customer.firstName} ${
              customer.lastName || ""
            }`.trim()
          );
        }

        // Lưu phone
        if (customer?.phone) {
          localStorage.setItem(
            "customerPhone",
            customer.phone
          );
        }

        // Lưu customer ID
        if (customer?.id || customer?._id) {
          localStorage.setItem(
            "customerId",
            customer.id || customer._id
          );
        }

        // Lưu email
        if (customer?.email || credentials.email) {
          localStorage.setItem(
            "customerEmail",
            (
              customer?.email ||
              credentials.email
            )
              .trim()
              .toLowerCase()
          );
        }

        // Redirect
        const redirectTarget =
          searchParams.get("redirect") ||
          "/customer/home";

        navigate(redirectTarget);
      } else {
        setError(
          "Phản hồi không hợp lệ từ máy chủ xác thực."
        );
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          err.response?.data?.errors?.[0] ||
          "Đăng nhập thất bại. Vui lòng kiểm tra lại email và mật khẩu."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        /* =====================================================
           AUTH LOGIN
        ===================================================== */

        .login-page {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          background: linear-gradient(
            135deg,
            #fff8f3 0%,
            #ffffff 50%,
            #fff5ed 100%
          );
        }

        .login-main {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 50px 20px;
        }

        .login-card {
          width: 100%;
          max-width: 460px;
          background: #ffffff;
          border-radius: 20px;
          padding: 40px;
          box-shadow:
            0 15px 45px rgba(0, 0, 0, 0.08),
            0 3px 12px rgba(0, 0, 0, 0.04);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .login-header {
          text-align: center;
          margin-bottom: 30px;
        }

        .login-brand-badge {
          width: 58px;
          height: 58px;
          margin: 0 auto 18px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(
            135deg,
            #ff6b35,
            #ff8a5b
          );
          color: #ffffff;
          box-shadow:
            0 8px 20px rgba(255, 107, 53, 0.25);
        }

        .login-title {
          margin: 0 0 10px;
          font-size: 28px;
          line-height: 1.25;
          font-weight: 700;
          color: #222222;
        }

        .login-subtitle {
          margin: 0;
          color: #777777;
          font-size: 14px;
          line-height: 1.6;
        }

        .login-error {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          margin-bottom: 20px;
          padding: 13px 15px;
          border-radius: 10px;
          background: #fff1f0;
          border: 1px solid #ffccc7;
          color: #d9363e;
          font-size: 14px;
          line-height: 1.5;
        }

        .login-error svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .login-password-row {
          display: flex;
          justify-content: flex-end;
          margin-top: -8px;
          margin-bottom: 16px;
        }

        .forgot-password-link {
          color: #ff6b35;
          font-size: 14px;
          font-weight: 600;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .forgot-password-link:hover {
          color: #e85520;
          text-decoration: underline;
        }

        .login-button-wrapper {
          margin-top: 20px;
        }

        .login-register {
          margin-top: 26px;
          padding-top: 22px;
          border-top: 1px solid #eeeeee;
          text-align: center;
          color: #777777;
          font-size: 14px;
        }

        .login-register a {
          color: #ff6b35;
          font-weight: 600;
          text-decoration: none;
          margin-left: 4px;
        }

        .login-register a:hover {
          text-decoration: underline;
        }

        @media (max-width: 576px) {
          .login-main {
            padding: 30px 15px;
          }

          .login-card {
            padding: 28px 22px;
            border-radius: 16px;
          }

          .login-title {
            font-size: 24px;
          }

          .login-subtitle {
            font-size: 13px;
          }
        }
      `}</style>

      <div className="login-page">
        <Header />

        <main className="login-main">
          <motion.div
            className="login-card"
            initial={{
              opacity: 0,
              y: 20,
            }}
            animate={{
              opacity: 1,
              y: 0,
            }}
            transition={{
              duration: 0.3,
            }}
          >
            {/* HEADER */}
            <div className="login-header">
              <div className="login-brand-badge">
                <FaUtensils size={24} />
              </div>

              <h2 className="login-title">
                Chào mừng trở lại
              </h2>

              <p className="login-subtitle">
                Đăng nhập để theo dõi đơn hàng, lưu món
                yêu thích và giao hàng nhanh
              </p>
            </div>

            {/* NOTICE MESSAGE */}
            {noticeMessage && (
              <motion.div
                className="auth-notice-banner"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.75rem",
                  backgroundColor: "#eff6ff",
                  border: "1px solid #bfdbfe",
                  color: "#1d4ed8",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1rem",
                  fontSize: "0.9rem",
                  fontWeight: "500",
                }}
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                <FaInfoCircle size={18} />

                <span>
                  {noticeMessage}
                </span>
              </motion.div>
            )}

            {/* ERROR */}
            {error && (
              <motion.div
                className="login-error"
                initial={{
                  opacity: 0,
                  y: -8,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
              >
                <FaExclamationCircle size={18} />

                <span>
                  {error}
                </span>
              </motion.div>
            )}

            {/* LOGIN FORM */}
            <form onSubmit={handleSubmit}>
              <Input
                label="Địa chỉ Email"
                name="email"
                type="email"
                placeholder="ten@example.com"
                icon={FaEnvelope}
                value={credentials.email}
                onChange={handleChange}
                required
              />

              <Input
                label="Mật khẩu"
                name="password"
                type="password"
                placeholder="••••••••"
                icon={FaLock}
                value={credentials.password}
                onChange={handleChange}
                required
              />

              {/* QUÊN MẬT KHẨU */}
              <div className="login-password-row">
                <Link
                  to="/auth/forgot-password"
                  className="forgot-password-link"
                >
                  Quên mật khẩu?
                </Link>
              </div>

              {/* LOGIN BUTTON */}
              <div className="login-button-wrapper">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  fullWidth
                  loading={loading}
                  icon={FaSignInAlt}
                >
                  Đăng nhập
                </Button>
              </div>
            </form>
            
            {/* GOOGLE LOGIN */}
<div className="google-login-section">
  <div className="login-divider">
    <span>HOẶC</span>
  </div>

  <div className="google-login-button">
    <GoogleLogin
      onSuccess={handleGoogleLogin}
      onError={() => {
        setError(
          "Đăng nhập bằng Google thất bại. Vui lòng thử lại."
        );
      }}
      useOneTap={false}
      theme="outline"
      size="large"
      text="signin_with"
      shape="rectangular"
      width="380"
    />
  </div>
</div>

            {/* REGISTER */}
            <div className="login-register">
              Chưa có tài khoản SkyDish?

              <Link to="/auth/register">
                Đăng ký ngay
              </Link>
            </div>
          </motion.div>
        </main>

        <Footer />
      </div>
    </>
  );
}