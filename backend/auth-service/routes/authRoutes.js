const express = require("express");
const router  = express.Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "auth-service", timestamp: new Date().toISOString() }));
const authController = require("../controllers/customerController");
const { protect } = require("../middlewares/auth"); // your JWT-checker
const { loginLimiter } = require("../middlewares/rateLimiter");

router.post("/register/customer", authController.register);
router.post("/login",           loginLimiter, authController.login);

// Protected customer routes
router
  .route("/customer/profile")
  .get(protect, authController.getProfile)
  .patch(protect, authController.updateProfile);

module.exports = router;
