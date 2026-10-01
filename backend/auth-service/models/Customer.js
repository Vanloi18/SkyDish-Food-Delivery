// backend/auth-service/models/Customer.js

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const customerSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: false,
      trim: true,
      default: "",
    },

    // ========================================================
    // AUTHENTICATION
    // ========================================================

    // Password chỉ bắt buộc đối với tài khoản đăng ký
    // bằng email/password.
    password: {
      type: String,
      required: false,
      minlength: 6,
      select: false,
    },

    // Google account ID
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },

    // Provider dùng để biết tài khoản đăng nhập bằng cách nào
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },

    location: {
      type: String,
      required: false,
      trim: true,
    },

    // ========================================================
    // FORGOT PASSWORD / OTP
    // ========================================================

    resetPasswordOTP: {
      type: String,
      default: null,
      select: false,
    },

    resetPasswordOTPExpires: {
      type: Date,
      default: null,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);

// ============================================================
// HASH PASSWORD
// ============================================================

customerSchema.pre("save", async function (next) {
  // Google account không có password
  if (!this.password) {
    return next();
  }

  if (!this.isModified("password")) {
    return next();
  }

  this.password = await bcrypt.hash(this.password, 12);

  next();
});

// ============================================================
// COMPARE PASSWORD
// ============================================================

customerSchema.methods.comparePassword = async function (candidate) {
  // Tài khoản Google không có password
  if (!this.password) {
    return false;
  }

  return bcrypt.compare(candidate, this.password);
};

module.exports =
  mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);