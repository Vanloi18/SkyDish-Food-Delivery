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
      required: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
      select: false,
    },

    location: {
      type: String,
      required: false,
      trim: true,
    },

    // ========================================================
    // FORGOT PASSWORD / OTP
    // ========================================================

    // OTP đã được hash trước khi lưu vào MongoDB
    resetPasswordOTP: {
      type: String,
      default: null,
      select: false,
    },

    // Thời điểm OTP hết hạn
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
  return bcrypt.compare(candidate, this.password);
};

module.exports =
  mongoose.models.Customer ||
  mongoose.model("Customer", customerSchema);
