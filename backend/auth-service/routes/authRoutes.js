// backend/auth-service/routes/authRoutes.js

const express = require("express");
const router = express.Router();

const authController = require("../controllers/customerController");
const { protect } = require("../middlewares/auth"); // your JWT-checker
const { loginLimiter } = require("../middlewares/rateLimiter");

// ============================================================
// HEALTH CHECK
// ============================================================

router.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "auth-service",
    timestamp: new Date().toISOString(),
  });
});

// ============================================================
// PUBLIC AUTH ROUTES
// ============================================================

// Customer register
router.post(
  "/register/customer",
  authController.register
);

// Customer login
router.post(
  "/login",
  loginLimiter,
  authController.login
);

// Google Login
router.post(
  "/google",
  authController.googleLogin
);

// ============================================================
// FORGOT PASSWORD / OTP
// ============================================================

// Gửi OTP về email
router.post(
  "/forgot-password",
  authController.forgotPassword
);

// Xác nhận OTP
router.post(
  "/verify-otp",
  authController.verifyOTP
);

// Đặt lại mật khẩu
router.post(
  "/reset-password",
  authController.resetPassword
);

// ============================================================
// PROTECTED CUSTOMER ROUTES
// ============================================================

router
  .route("/customer/profile")
  .get(
    protect,
    authController.getProfile
  )
  .patch(
    protect,
    authController.updateProfile
  );

module.exports = router;