const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema({
  orderId: { type: String, required: true, unique: true }, // Unique per order
  userId: { type: String, required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: "vnd" },
  paymentMethod: {
    type: String,
    enum: ["STRIPE", "VNPAY", "MOMO", "COD", "BANK_TRANSFER"],
    default: "STRIPE",
  },
  status: {
    type: String,
    enum: ["Pending", "Paid", "Failed", "Expired", "Cancelled"],
    default: "Pending",
  },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  // Bank Transfer (VietQR) fields
  bankDetails: {
    bankCode: { type: String },
    bankName: { type: String },
    accountNumber: { type: String },
    accountHolder: { type: String },
    paymentRef: { type: String },
    qrUrl: { type: String },
  },
  customerReportedTransfer: { type: Boolean, default: false },
  transferReportedAt: { type: Date },
  // Stripe-specific fields
  stripePaymentIntentId: { type: String, sparse: true },
  stripeClientSecret: { type: String },
  // VNPay / MoMo / Provider fields
  providerTransactionId: { type: String },
  providerResponse: { type: mongoose.Schema.Types.Mixed },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Update updatedAt on save.
PaymentSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Payment", PaymentSchema);
