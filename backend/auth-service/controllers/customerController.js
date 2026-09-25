const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { OAuth2Client } = require("google-auth-library");

const Customer = require("../models/Customer");
const { sendOTPEmail } = require("../services/emailService");

// ============================================================
// GOOGLE OAUTH CLIENT
// ============================================================

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID
);

// ============================================================
// HELPER: SIGN JWT
// ============================================================

const signToken = (customer) => {
  return jwt.sign(
    {
      id: customer._id.toString(),
      role: "customer",
      email: customer.email,
      name: `${customer.firstName || ""} ${
        customer.lastName || ""
      }`.trim(),
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
// REGISTER CUSTOMER
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

    const existingCustomer = await Customer.findOne({
      email: normalizedEmail,
    });

    if (existingCustomer) {
      return res.status(409).json({
        message: "Email already registered.",
      });
    }

    const customer = await Customer.create({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: normalizedEmail,
      phone: phone.trim(),
      password,
      location,
      authProvider: "local",
    });

    const token = signToken(customer);

    return res.status(201).json({
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
    console.error("Register error:", err);
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

    // Google-only account may not have a password
    if (!customer.password) {
      return res.status(401).json({
        message:
          "This account uses Google login. Please continue with Google.",
      });
    }

    const validPassword = await customer.comparePassword(password);

    if (!validPassword) {
      return res.status(401).json({
        message: "Invalid credentials.",
      });
    }

    const token = signToken(customer);

    return res.json({
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
    console.error("Login error:", err);
    next(err);
  }
};

// ============================================================
// GOOGLE LOGIN
// POST /api/auth/google
// ============================================================

exports.googleLogin = async (req, res, next) => {
  try {
    const { credential } = req.body;

    // --------------------------------------------------------
    // Validate credential
    // --------------------------------------------------------

    if (!credential) {
      return res.status(400).json({
        message: "Google credential is required.",
      });
    }

    // --------------------------------------------------------
    // Validate Google Client ID
    // --------------------------------------------------------

    if (!process.env.GOOGLE_CLIENT_ID) {
      console.error(
        "GOOGLE_CLIENT_ID is not configured in auth-service."
      );

      return res.status(500).json({
        message:
          "Google login is not configured on the server.",
      });
    }

    // --------------------------------------------------------
    // Verify Google ID Token
    // --------------------------------------------------------

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();

    if (!payload) {
      return res.status(401).json({
        message: "Invalid Google credential.",
      });
    }

    const {
      sub: googleId,
      email,
      email_verified: emailVerified,
      given_name: givenName,
      family_name: familyName,
      name,
    } = payload;

    // --------------------------------------------------------
    // Validate Google account
    // --------------------------------------------------------

    if (!googleId || !email) {
      return res.status(401).json({
        message: "Invalid Google account information.",
      });
    }

    if (!emailVerified) {
      return res.status(401).json({
        message: "Google email is not verified.",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // --------------------------------------------------------
    // Find existing customer
    //
    // Priority:
    // 1. googleId
    // 2. email
    // --------------------------------------------------------

    let customer = await Customer.findOne({
      $or: [
        {
          googleId: googleId,
        },
        {
          email: normalizedEmail,
        },
      ],
    });

    // --------------------------------------------------------
    // Create new customer
    // --------------------------------------------------------

    if (!customer) {
      const fullName = name || "Google User";

      const nameParts = fullName.trim().split(/\s+/);

      const firstName =
        givenName ||
        nameParts[0] ||
        "Google";

      const lastName =
        familyName ||
        nameParts.slice(1).join(" ") ||
        "User";

      customer = await Customer.create({
        firstName,
        lastName,
        email: normalizedEmail,

        // Google accounts do not require phone/password
        phone: "",

        // Do not create a local password
        password: undefined,

        googleId,
        authProvider: "google",
      });
    } else {
      // ------------------------------------------------------
      // Existing account
      // Link Google account if necessary
      // ------------------------------------------------------

      let changed = false;

      if (!customer.googleId) {
        customer.googleId = googleId;
        changed = true;
      }

      if (!customer.authProvider) {
        customer.authProvider = "google";
        changed = true;
      }

      if (changed) {
        await customer.save();
      }
    }

    // --------------------------------------------------------
    // Generate JWT
    // --------------------------------------------------------

    const token = signToken(customer);

    // --------------------------------------------------------
    // Return customer
    // --------------------------------------------------------

    return res.status(200).json({
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
    console.error("Google login error:", err);

    return res.status(401).json({
      message: "Google authentication failed.",
    });
  }
};

// ============================================================
// GET CUSTOMER PROFILE
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

    return res.json({
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
    console.error("Get profile error:", err);
    next(err);
  }
};

// ============================================================
// UPDATE CUSTOMER PROFILE
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

    return res.json({
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
    console.error("Update profile error:", err);
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

    // Do not reveal whether email exists
    if (!customer) {
      return res.json({
        status: "success",
        message:
          "If this email is registered, an OTP has been sent.",
      });
    }

    // --------------------------------------------------------
    // Generate OTP
    // --------------------------------------------------------

    const otp = generateOTP();

    // Hash OTP before saving
    const hashedOTP = await bcrypt.hash(otp, 10);

    customer.resetPasswordOTP = hashedOTP;

    customer.resetPasswordOTPExpires = new Date(
      Date.now() + 5 * 60 * 1000
    );

    await customer.save();

    // --------------------------------------------------------
    // Send OTP email
    // --------------------------------------------------------

    await sendOTPEmail(customer.email, otp);

    return res.json({
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

    // --------------------------------------------------------
    // Check expiration
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Compare OTP
    // --------------------------------------------------------

    const validOTP = await bcrypt.compare(
      otp.toString(),
      customer.resetPasswordOTP
    );

    if (!validOTP) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    return res.json({
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

    // --------------------------------------------------------
    // Check OTP expiration
    // --------------------------------------------------------

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

    // --------------------------------------------------------
    // Verify OTP
    // --------------------------------------------------------

    const validOTP = await bcrypt.compare(
      otp.toString(),
      customer.resetPasswordOTP
    );

    if (!validOTP) {
      return res.status(400).json({
        message: "Invalid OTP.",
      });
    }

    // --------------------------------------------------------
    // Update password
    // Customer model should hash password in pre-save hook
    // --------------------------------------------------------

    customer.password = newPassword;
    customer.resetPasswordOTP = null;
    customer.resetPasswordOTPExpires = null;

    await customer.save();

    return res.json({
      status: "success",
      message:
        "Password reset successfully. You can now log in.",
    });
  } catch (err) {
    console.error("Reset password error:", err);
    next(err);
  }
};