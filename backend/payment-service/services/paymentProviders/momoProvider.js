const crypto = require("crypto");
const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Payment = require("../../models/PaymentModel");

/**
 * Retrieve and validate MoMo configuration from environment variables
 */
function getMoMoConfig() {
  const partnerCode = process.env.MOMO_PARTNER_CODE || "";
  const accessKey = process.env.MOMO_ACCESS_KEY || "";
  const secretKey = process.env.MOMO_SECRET_KEY || "";
  const endpoint = process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";
  const redirectUrl = process.env.MOMO_REDIRECT_URL || process.env.MOMO_RETURN_URL || "http://localhost:3000/payment/momo/callback";
  const ipnUrl = process.env.MOMO_IPN_URL || process.env.MOMO_NOTIFY_URL || "http://localhost:5004/api/payment/momo/ipn";

  const missing = [];
  if (!partnerCode || partnerCode === "MOMO_PARTNER_TEST") missing.push("MOMO_PARTNER_CODE");
  if (!accessKey || accessKey === "MOMO_ACCESS_KEY_TEST") missing.push("MOMO_ACCESS_KEY");
  if (!secretKey || secretKey === "MOMO_SECRET_KEY_TEST") missing.push("MOMO_SECRET_KEY");

  return {
    partnerCode,
    accessKey,
    secretKey,
    endpoint,
    redirectUrl,
    ipnUrl,
    missing,
    isConfigured: missing.length === 0,
  };
}

/**
 * Helper: Calculate HMAC-SHA256 signature for MoMo create payment request
 */
function calculateMoMoCreateSignature({
  accessKey,
  secretKey,
  amount,
  extraData = "",
  ipnUrl,
  orderId,
  orderInfo,
  partnerCode,
  redirectUrl,
  requestId,
  requestType = "captureWallet",
}) {
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

/**
 * Helper: Calculate HMAC-SHA256 signature for MoMo IPN / callback response
 */
function calculateMoMoCallbackSignature({
  accessKey,
  secretKey,
  amount,
  extraData = "",
  message = "",
  orderId,
  orderInfo = "",
  orderType = "",
  partnerCode,
  payType = "",
  requestId,
  responseTime,
  resultCode,
  transId = "",
}) {
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;
  return crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");
}

/**
 * Synchronize payment status with Order Service and MongoDB orders collection
 */
async function syncOrderStatus(orderId, { paymentStatus, status }) {
  // 1. Direct MongoDB update to 'orders' collection
  try {
    const db = mongoose.connection.db;
    if (db) {
      const ordersCol = db.collection("orders");
      const filter = mongoose.Types.ObjectId.isValid(orderId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(orderId) }, { _id: String(orderId) }] }
        : { _id: String(orderId) };

      const updateDoc = {
        $set: {
          paymentStatus,
          ...(status ? { status } : {}),
          updatedAt: new Date(),
        },
      };
      await ordersCol.updateOne(filter, updateDoc);
    }
  } catch (dbErr) {
    console.warn("Notice: Order synchronization to MongoDB failed:", dbErr.message);
  }

  // 2. HTTP notification to Order Service with system JWT to trigger real-time events
  try {
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://order-service:5005";
    const jwtSecret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
    const systemToken = jwt.sign({ id: "system_payment", role: "admin" }, jwtSecret, { expiresIn: "1h" });

    if (status) {
      await axios.patch(
        `${orderServiceUrl}/api/orders/${orderId}/status`,
        { status },
        {
          headers: { Authorization: `Bearer ${systemToken}` },
          timeout: 3000,
        }
      ).catch(() => {});
    }
  } catch (httpErr) {
    console.warn("Notice: Order Service HTTP sync notice:", httpErr.message);
  }
}

/**
 * Create MoMo Payment Transaction (API v2 captureWallet)
 */
async function createMoMoPayment({
  orderId,
  userId,
  amount,
  email,
  phone,
  orderInfo,
  extraData = "",
}) {
  const config = getMoMoConfig();

  // Fail fast if required MoMo credentials are missing
  if (!config.isConfigured) {
    const err = new Error(`Thiếu cấu hình MoMo Sandbox: [${config.missing.join(", ")}].`);
    err.statusCode = 400;
    err.missingVars = config.missing;
    throw err;
  }

  if (!userId || userId === "GUEST") {
    const error = new Error("Unauthorized: Guest payments are strictly prohibited. Please login.");
    error.statusCode = 401;
    throw error;
  }

  // Idempotency: Check if existing payment is already paid
  let payment = await Payment.findOne({ orderId });
  if (payment && payment.status === "Paid") {
    return {
      message: "✅ This order has already been paid successfully.",
      paymentStatus: "Paid",
      disablePayment: true,
      orderId,
      amount: payment.amount,
      provider: "MOMO",
    };
  }

  const requestId = `${orderId}_${Date.now()}`;
  const roundedAmount = Math.round(Number(amount));
  const description = orderInfo || `Thanh toan don hang SkyDish ${orderId}`;
  const requestType = "captureWallet";

  const signature = calculateMoMoCreateSignature({
    accessKey: config.accessKey,
    secretKey: config.secretKey,
    amount: roundedAmount,
    extraData,
    ipnUrl: config.ipnUrl,
    orderId,
    orderInfo: description,
    partnerCode: config.partnerCode,
    redirectUrl: config.redirectUrl,
    requestId,
    requestType,
  });

  const requestBody = {
    partnerCode: config.partnerCode,
    partnerName: "SkyDish Food Delivery",
    storeId: "SkyDish",
    requestId,
    amount: roundedAmount,
    orderId,
    orderInfo: description,
    redirectUrl: config.redirectUrl,
    ipnUrl: config.ipnUrl,
    lang: "vi",
    extraData,
    requestType,
    signature,
  };

  // Save or update Payment record in Pending status
  if (!payment) {
    payment = new Payment({
      orderId,
      userId: String(userId),
      amount: roundedAmount,
      currency: "vnd",
      paymentMethod: "MOMO",
      status: "Pending",
      email: email || "customer@example.com",
      phone: phone || "+84901234567",
      providerTransactionId: orderId,
    });
  } else {
    payment.paymentMethod = "MOMO";
    payment.status = "Pending";
  }
  await payment.save();

  try {
    const response = await axios.post(config.endpoint, requestBody, {
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });

    if (response.data && Number(response.data.resultCode) === 0) {
      return {
        payUrl: response.data.payUrl,
        qrCodeUrl: response.data.qrCodeUrl,
        deeplink: response.data.deeplink,
        orderId,
        requestId,
        amount: roundedAmount,
        provider: "MOMO",
        resultCode: 0,
        message: response.data.message || "Khởi tạo thanh toán MoMo thành công",
      };
    } else {
      // Real MoMo API rejection - NO MOCK REDIRECT
      const errMsg = response.data?.message || "MoMo API trả về mã lỗi không xác định";
      const error = new Error(`MoMo error (code ${response.data?.resultCode}): ${errMsg}`);
      error.statusCode = 400;
      error.resultCode = response.data?.resultCode;
      error.momoResponse = response.data;
      throw error;
    }
  } catch (err) {
    console.error("❌ MoMo API Gateway Request Failed:", err.response?.data || err.message);
    const status = err.response?.status || err.statusCode || 500;
    const msg = err.response?.data?.message || err.message || "Không thể kết nối đến máy chủ MoMo Sandbox";
    const error = new Error(msg);
    error.statusCode = status;
    error.resultCode = err.response?.data?.resultCode || err.resultCode || 99;
    error.details = err.response?.data;
    throw error;
  }
}

/**
 * Verify MoMo IPN / Webhook / Callback notification
 * Enforces:
 * 1. HMAC-SHA256 signature verification
 * 2. Order ID existence check
 * 3. Amount integrity verification
 * 4. Idempotency against duplicates
 * 5. Order status synchronization
 */
async function verifyMoMoNotification(payload) {
  const {
    partnerCode,
    orderId,
    requestId,
    amount,
    orderInfo = "",
    orderType = "",
    transId = "",
    resultCode,
    message = "",
    payType = "",
    responseTime,
    extraData = "",
    signature,
  } = payload;

  const config = getMoMoConfig();
  const secretKey = config.secretKey;
  const accessKey = payload.accessKey || config.accessKey;

  // 1. Verify HMAC-SHA256 signature
  const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&message=${message}&orderId=${orderId}&orderInfo=${orderInfo}&orderType=${orderType}&partnerCode=${partnerCode}&payType=${payType}&requestId=${requestId}&responseTime=${responseTime}&resultCode=${resultCode}&transId=${transId}`;

  const expectedSignature = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const isValidSignature = signature === expectedSignature;
  if (!isValidSignature) {
    return {
      isValid: false,
      isSuccess: false,
      orderId,
      error: "Chữ ký HMAC-SHA256 MoMo không hợp lệ (Signature mismatch).",
      code: "INVALID_SIGNATURE",
    };
  }

  // 2. Verify Order ID existence
  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    return {
      isValid: false,
      isSuccess: false,
      orderId,
      error: `Không tìm thấy bản ghi thanh toán cho đơn hàng ${orderId}.`,
      code: "ORDER_NOT_FOUND",
    };
  }

  // 3. Verify Amount
  const receivedAmount = Math.round(Number(amount));
  const expectedAmount = Math.round(Number(payment.amount));
  if (receivedAmount !== expectedAmount) {
    return {
      isValid: false,
      isSuccess: false,
      orderId,
      error: `Số tiền thanh toán không khớp. Kỳ vọng: ${expectedAmount} ₫, Nhận được: ${receivedAmount} ₫.`,
      code: "AMOUNT_MISMATCH",
    };
  }

  // 4. Idempotency check: duplicate callback should not re-process or duplicate order
  if (payment.status === "Paid") {
    return {
      isValid: true,
      isSuccess: true,
      isAlreadyPaid: true,
      orderId,
      amount: expectedAmount,
      transId: payment.providerTransactionId || transId,
      resultCode: 0,
      message: "Giao dịch đã được ghi nhận thanh toán thành công trước đó.",
    };
  }

  // 5. Update Payment status & Synchronize Order status
  const isSuccess = Number(resultCode) === 0;
  payment.status = isSuccess ? "Paid" : "Failed";
  if (transId) payment.providerTransactionId = String(transId);
  payment.providerResponse = payload;
  await payment.save();

  await syncOrderStatus(orderId, {
    paymentStatus: isSuccess ? "Paid" : "Failed",
    status: isSuccess ? "Confirmed" : undefined,
  });

  return {
    isValid: true,
    isSuccess,
    orderId,
    amount: expectedAmount,
    transId: String(transId || ""),
    resultCode: Number(resultCode),
    message: isSuccess
      ? "Thanh toán MoMo thành công!"
      : `Giao dịch MoMo không thành công (${message || "Đã hủy"}).`,
  };
}

module.exports = {
  getMoMoConfig,
  calculateMoMoCreateSignature,
  calculateMoMoCallbackSignature,
  syncOrderStatus,
  createMoMoPayment,
  verifyMoMoNotification,
};
