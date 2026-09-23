const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "payment-service", timestamp: new Date().toISOString() }));
const Payment = require("../models/PaymentModel");
const { processStripePayment } = require("../services/paymentProviders/stripeProvider");
const { createVNPayUrl, verifyVNPayReturn, processVNPayIpn } = require("../services/paymentProviders/vnpayProvider");
const { createMoMoPayment, verifyMoMoNotification } = require("../services/paymentProviders/momoProvider");
const { processCodPayment } = require("../services/paymentProviders/codProvider");
const {
  getBankTransferConfig,
  createBankTransferPayment,
  confirmCustomerTransfer,
  verifyBankTransactionWebhook,
} = require("../services/paymentProviders/bankTransferProvider");

const jwt = require("jsonwebtoken");

const getAuthUser = (req) => {
  const authHeader = req.header("Authorization");
  if (!authHeader) return null;
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : authHeader.trim();
  try {
    const secret = process.env.JWT_SECRET || 'supersecretjwtkeyforfooddeliverymicroservices2025';
    return jwt.verify(token, secret);
  } catch (e) {
    return null;
  }
};

// Validate positive payment amount
const validatePaymentAmount = (amount) => {
  if (amount === undefined || amount === null) return true;
  const val = Number(amount);
  return !isNaN(val) && val > 0;
};

// ==========================================
// 1. STRIPE PAYMENT FLOW (PRESERVED)
// ==========================================
router.post("/process", async (req, res) => {
  try {
    if (!validatePaymentAmount(req.body.amount)) {
      return res.status(400).json({ error: "Invalid payment amount: must be greater than 0" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    req.body.userId = authUser.id;

    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const result = await processStripePayment(req.body);
    return res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    // Handle duplicate key recovery gracefully
    if (error.code === 11000) {
      let existingPayment = await Payment.findOne({ orderId: req.body.orderId });
      if (existingPayment) {
        if (existingPayment.status === "Paid") {
          return res.status(200).json({
            message: "✅ This order has already been paid successfully.",
            paymentStatus: "Paid",
            disablePayment: true,
          });
        }
        return res.json({
          clientSecret: existingPayment.stripeClientSecret,
          paymentId: existingPayment._id,
          disablePayment: false,
        });
      }
    }
    console.error("❌ Stripe Payment processing error:", error.message || error);
    res.status(500).json({ error: "❌ Payment processing failed. Please try again." });
  }
});

// ==========================================
// 2. VNPAY PAYMENT FLOW
// ==========================================
router.post("/vnpay/create", async (req, res) => {
  try {
    if (!validatePaymentAmount(req.body.amount)) {
      return res.status(400).json({ error: "Invalid payment amount: must be greater than 0" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    req.body.userId = authUser.id;

    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
    const result = await createVNPayUrl({ ...req.body, ipAddr: clientIp });
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ VNPay creation error:", error.message || error);
    return res.status(500).json({ error: "VNPay payment creation failed. Please try again." });
  }
});

router.get("/vnpay/callback", async (req, res) => {
  try {
    const result = await verifyVNPayReturn(req.query);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ VNPay return verification error:", error.message || error);
    return res.status(500).json({ error: "VNPay signature verification failed." });
  }
});

const handleVNPayIpn = async (req, res) => {
  try {
    const result = await processVNPayIpn(req.body);
    return res.status(result.RspCode === "00" ? 200 : 400).json({
      RspCode: result.RspCode,
      Message: result.Message,
    });
  } catch (error) {
    console.error("❌ VNPay IPN error:", error.message || error);
    return res.status(500).json({ RspCode: "99", Message: "Unknown error" });
  }
};

router.post("/vnpay/ipn", handleVNPayIpn);

// ==========================================
// 3. MOMO PAYMENT FLOW
// ==========================================
router.post("/momo/create", async (req, res) => {
  try {
    if (!validatePaymentAmount(req.body.amount)) {
      return res.status(400).json({ error: "Invalid payment amount: must be greater than 0" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    req.body.userId = authUser.id;

    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const result = await createMoMoPayment(req.body);
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ MoMo creation error:", error.message || error);
    const status = error.statusCode || 500;
    return res.status(status).json({
      error: error.message || "MoMo payment initialization failed. Please try again.",
      missingVars: error.missingVars,
      resultCode: error.resultCode,
    });
  }
});

router.post("/momo/ipn", async (req, res) => {
  try {
    const result = await verifyMoMoNotification(req.body);
    if (!result.isValid) {
      console.warn("❌ MoMo IPN rejected:", result.error);
      return res.status(400).json({ error: result.error, code: result.code });
    }

    // According to MoMo v2 specification, acknowledge IPN with HTTP 204 No Content
    return res.status(204).send();
  } catch (error) {
    console.error("❌ MoMo IPN error:", error.message || error);
    return res.status(500).json({ error: "MoMo IPN processing error" });
  }
});

router.get("/momo/callback", async (req, res) => {
  try {
    const result = await verifyMoMoNotification(req.query);
    if (!result.isValid) {
      return res.status(400).json({
        isValid: false,
        isSuccess: false,
        orderId: req.query.orderId,
        error: result.error,
        message: result.error,
      });
    }

    return res.status(200).json({
      isValid: true,
      isSuccess: result.isSuccess,
      orderId: result.orderId,
      amount: result.amount,
      transId: result.transId,
      isAlreadyPaid: result.isAlreadyPaid || false,
      message: result.message,
    });
  } catch (error) {
    console.error("❌ MoMo return callback error:", error.message || error);
    return res.status(500).json({ error: "MoMo callback processing error." });
  }
});

// ==========================================
// ==========================================
// 4. CASH ON DELIVERY (COD) FLOW
// ==========================================
router.post("/cod/process", async (req, res) => {
  try {
    if (!validatePaymentAmount(req.body.amount)) {
      return res.status(400).json({ error: "Invalid payment amount: must be greater than 0" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    req.body.userId = authUser.id;

    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const result = await processCodPayment(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("❌ COD processing error:", error.message || error);
    return res.status(500).json({ error: "Cash on Delivery order processing failed." });
  }
});

// ==========================================
// 5. BANK TRANSFER / VIETQR FLOW
// ==========================================
router.get("/bank-transfer/config", (req, res) => {
  const config = getBankTransferConfig();
  return res.status(200).json({
    enabled: config.enabled,
    bankCode: config.bankCode,
    bankName: config.bankName,
    accountNumber: config.accountNumber,
    accountHolder: config.accountHolder,
  });
});

router.post("/bank-transfer/create", async (req, res) => {
  try {
    if (!validatePaymentAmount(req.body.amount)) {
      return res.status(400).json({ error: "Invalid payment amount: must be greater than 0" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    req.body.userId = authUser.id;

    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const result = await createBankTransferPayment(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("❌ Bank transfer creation error:", error.message || error);
    return res.status(500).json({ error: "Bank Transfer QR initialization failed." });
  }
});

router.post("/bank-transfer/confirm-request", async (req, res) => {
  try {
    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required" });
    }
    const existingPayment = await Payment.findOne({ orderId: req.body.orderId });
    if (existingPayment && authUser.role !== 'admin' && authUser.role !== 'superAdmin' && existingPayment.userId && existingPayment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: This order belongs to another user" });
    }

    const result = await confirmCustomerTransfer(req.body);
    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("❌ Bank transfer confirm request error:", error.message || error);
    return res.status(500).json({ error: "Failed to record customer transfer notification." });
  }
});

router.post("/bank-transfer/webhook", async (req, res) => {
  try {
    const result = await verifyBankTransactionWebhook(req.body);
    if (!result.isValid) {
      return res.status(400).json(result);
    }
    return res.status(200).json(result);
  } catch (error) {
    console.error("❌ Bank transaction webhook error:", error.message || error);
    return res.status(500).json({ error: "Bank transaction webhook processing error." });
  }
});

// ==========================================
// 6. UNIFIED PAYMENT STATUS ENDPOINT
// ==========================================
router.get("/status/:orderId", async (req, res) => {
  try {
    const payment = await Payment.findOne({ orderId: req.params.orderId });
    if (!payment) {
      return res.status(404).json({ error: "Payment record not found" });
    }

    const authUser = getAuthUser(req);
    if (!authUser) {
      return res.status(401).json({ error: "Unauthorized: Authentication required to view payment status" });
    }
    if (authUser.role !== 'admin' && authUser.role !== 'superAdmin' && payment.userId && payment.userId !== authUser.id) {
      return res.status(403).json({ error: "Access denied: Not your payment record" });
    }

    return res.status(200).json({
      orderId: payment.orderId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod || "STRIPE",
      status: payment.status,
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
    });
  } catch (error) {
    console.error("❌ Status lookup error:", error.message || error);
    return res.status(500).json({ error: "Server error retrieving payment status." });
  }
});

module.exports = router;
module.exports.handleVNPayIpn = handleVNPayIpn;
