const rateLimit = require("express-rate-limit");

/**
 * Rate limiting middleware for authentication endpoints
 * Mitigates brute-force credential stuffing by restricting excessive failed login attempts per IP.
 * Defaults: 10 attempts per 15 minutes window in production/development.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "test" ? 1000 : parseInt(process.env.AUTH_RATE_LIMIT_MAX || "10", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: "error",
    message: "Quá nhiều lần thử đăng nhập không thành công. Vui lòng thử lại sau 15 phút.",
  },
  skipSuccessfulRequests: true, // Only failed attempts consume quota
});

module.exports = { loginLimiter };
