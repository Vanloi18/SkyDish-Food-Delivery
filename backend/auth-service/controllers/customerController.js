// backend/auth-service/controllers/customerController.js

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const Customer = require("../models/Customer");
const { sendOTPEmail } = require("../services/emailService");

// ============================================================
// HELPER: SIGN JWT
// ============================================================

const signToken = (customer) => {
  return jwt.sign(
    {
      id: customer._id.toString(),
      role: "customer",
      email: customer.email,
      name: `${customer.firstName} ${customer.lastName}`,
    },
    process.env.JWT_SECRET ||
      "supersecretjwtkeyforfooddeliverymicroservices2025",
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// ============================================================
// HELPER: GENERATE OTP
// ============================================================

const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// ============================================================
// REGISTER
// POST /api/auth/register/customer
// ============================================================

exports.register = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      location,
    } = req.body;

    if (
      !firstName ||
      !lastName ||
      !email ||
      !phone ||
      !password
    ) {
      return res.status(400).json({
        message: "Please provide all required fields.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const existing = await Customer.findOne({
      email: normalizedEmail,
    });

    if (existing) {
      return res.status(409).json({
        message: "Email already registered.",
      });
    }

    const customer = await Customer.create({
      firstName,
      lastName,
      email: normalizedEmail,
      phone,
      password,
      location,
    });

    const token = signToken(customer);

    res.status(201).json({
      status: "success",
      token,
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          location: customer.location,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// LOGIN
// POST /api/auth/login
// ============================================================

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const customer = await Customer.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!customer) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const valid = await customer.comparePassword(password);

    if (!valid) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const token = signToken(customer);

    res.json({
      status: "success",
      token,
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          location: customer.location,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// GET PROFILE
// GET /api/auth/customer/profile
// ============================================================

exports.getProfile = async (req, res, next) => {
  try {
    const customer = await Customer.findById(req.userId);

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    res.json({
      status: "success",
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          location: customer.location,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// UPDATE PROFILE
// PATCH /api/auth/customer/profile
// ============================================================

exports.updateProfile = async (req, res, next) => {
  try {
    const {
      firstName,
      lastName,
      phone,
      location,
    } = req.body;

    const customer = await Customer.findByIdAndUpdate(
      req.userId,
      {
        firstName,
        lastName,
        phone,
        location,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!customer) {
      return res.status(404).json({
        message: "Customer not found.",
      });
    }

    res.json({
      status: "success",
      data: {
        customer: {
          id: customer._id,
          firstName: customer.firstName,
          lastName: customer.lastName,
          email: customer.email,
          phone: customer.phone,
          location: customer.location,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

// ============================================================
// FORGOT PASSWORD
// POST /api/auth/forgot-password
// ============================================================

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const customer = await Customer.findOne({
      email: normalizedEmail,
    });

    if (!customer) {
      return res.json({
        status: "success",
        message:
          "If this email is registered, an OTP has been sent.",
      });
    }

    const otp = generateOTP();

    const hashedOTP = await bcrypt.hash(otp, 10);

    customer.resetPasswordOTP = hashedOTP;

    customer.resetPasswordOTPExpires = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await customer.save();

    await sendOTPEmail(customer.email, otp);

    res.json({
      status: "success",
      message:
        "If this email is registered, an OTP has been sent.",
    });
  } catch (err) {
    console.error("Forgot password error:", err);
    next(err);
  }
};

// ============================================================
// VERIFY OTP
// POST /api/auth/verify-otp
// ============================================================

exports.verifyOTP = async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        message: "Email and OTP are required.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const customer = await Customer.findOne({
      email: normalizedEmail,
    }).select(
      "+resetPasswordOTP +resetPasswordOTPExpires"
    );

    if (!customer) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    if (
      !customer.resetPasswordOTP ||
      !customer.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        message: "OTP is invalid or has expired.",
      });
    }

    if (
      customer.resetPasswordOTPExpires.getTime() <
      Date.now()
    ) {
      customer.resetPasswordOTP = null;
      customer.resetPasswordOTPExpires = null;

      await customer.save();

      return res.status(400).json({
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    const validOTP = await bcrypt.compare(
      otp.toString(),
      customer.resetPasswordOTP
    );

    if (!validOTP) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    res.json({
      status: "success",
      message: "OTP verified successfully.",
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    next(err);
  }
};

// ============================================================
// RESET PASSWORD
// POST /api/auth/reset-password
// ============================================================

exports.resetPassword = async (req, res, next) => {
  try {
    const {
      email,
      otp,
      newPassword,
    } = req.body;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({
        message:
          "Email, OTP and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message:
          "New password must be at least 6 characters.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const customer = await Customer.findOne({
      email: normalizedEmail,
    }).select(
      "+password +resetPasswordOTP +resetPasswordOTPExpires"
    );

    if (!customer) {
      return res.status(400).json({
        message: "Invalid reset request.",
      });
    }

    if (
      !customer.resetPasswordOTP ||
      !customer.resetPasswordOTPExpires
    ) {
      return res.status(400).json({
        message: "OTP is invalid or has expired.",
      });
    }

    if (
      customer.resetPasswordOTPExpires.getTime() <
      Date.now()
    ) {
      customer.resetPasswordOTP = null;
      customer.resetPasswordOTPExpires = null;

      await customer.save();

      return res.status(400).json({
        message:
          "OTP has expired. Please request a new OTP.",
      });
    }

    const validOTP = await bcrypt.compare(
      otp.toString(),
      customer.resetPasswordOTP
    );

    if (!validOTP) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    customer.password = newPassword;
    customer.resetPasswordOTP = null;
    customer.resetPasswordOTPExpires = null;

    await customer.save();

    res.json({
      status: "success",
      message:
        "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    next(err);
  }
};