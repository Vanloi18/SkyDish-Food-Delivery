const { PayOS } = require("@payos/node");
const axios = require("axios");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const Payment = require("../../models/PaymentModel");

function createPayOSClient() {
  const config = {
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
  };
  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([name]) => name.replace(/[A-Z]/g, (letter) => `_${letter}`).toUpperCase());

  if (missing.length) {
    const error = new Error(`Thiếu cấu hình PayOS: ${missing.join(", ")}.`);
    error.statusCode = 503;
    throw error;
  }

  return new PayOS(config);
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/$/, "");
}

async function syncOrderStatus(orderId, { paymentStatus, status, cancellationReason }) {
  try {
    const db = mongoose.connection.db;
    if (db) {
      const filter = mongoose.Types.ObjectId.isValid(orderId)
        ? { $or: [{ _id: new mongoose.Types.ObjectId(orderId) }, { _id: String(orderId) }] }
        : { _id: String(orderId) };
      await db.collection("orders").updateOne(filter, {
        $set: {
          paymentStatus,
          ...(status ? { status } : {}),
          updatedAt: new Date(),
        },
      });
    }
  } catch (error) {
    console.warn("PayOS order database synchronization failed:", error.message);
  }

  if (!status) return;
  try {
    const orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://order-service:5005";
    const jwtSecret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
    const systemToken = jwt.sign({ id: "system_payment", role: "admin" }, jwtSecret, { expiresIn: "1h" });
    await axios.patch(
      `${orderServiceUrl}/api/orders/${orderId}/status`,
      { status, ...(cancellationReason ? { cancellationReason } : {}) },
      { headers: { Authorization: `Bearer ${systemToken}` }, timeout: 3000 }
    );
  } catch (error) {
    console.warn("PayOS Order Service synchronization failed:", error.message);
  }
}

async function applyPayOSStatus(payment, status, providerResponse, transactionId) {
  const statusMap = {
    PAID: "Paid",
    CANCELLED: "Cancelled",
    EXPIRED: "Expired",
    FAILED: "Failed",
  };
  const nextStatus = statusMap[status];
  if (!nextStatus) return nextStatus;
  if (payment.status === "Paid" && nextStatus !== "Paid") return payment.status;
  if (payment.status !== nextStatus) {
    payment.status = nextStatus;
    payment.providerResponse = providerResponse;
    if (transactionId) payment.providerTransactionId = String(transactionId);
    await payment.save();
    const isPaid = nextStatus === "Paid";
    await syncOrderStatus(payment.orderId, {
      paymentStatus: isPaid ? "Paid" : "Failed",
      status: isPaid ? "Confirmed" : "Canceled",
      cancellationReason: isPaid ? undefined : "Thanh toán PayOS chưa hoàn tất hoặc đã bị hủy.",
    });
  }
  return payment.status;
}

async function createPayOSPayment({ orderId, userId, amount, email, phone }) {
  const payos = createPayOSClient();
  if (!userId || userId === "GUEST") {
    const error = new Error("Vui lòng đăng nhập để thanh toán.");
    error.statusCode = 401;
    throw error;
  }
  if (!orderId || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
    const error = new Error("Mã đơn hàng hoặc số tiền thanh toán không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const roundedAmount = Math.round(Number(amount));
  let payment = await Payment.findOne({ orderId });
  if (payment?.status === "Paid") {
    return { paymentStatus: "Paid", disablePayment: true, orderId, amount: payment.amount };
  }
  if (payment?.paymentMethod === "PAYOS" && payment.status === "Pending" && payment.payosCheckoutUrl) {
    return {
      checkoutUrl: payment.payosCheckoutUrl,
      orderId,
      amount: payment.amount,
      provider: "PAYOS",
    };
  }

  const orderCode = Number(`${Date.now()}${String(Math.floor(Math.random() * 1000)).padStart(3, "0")}`);
  if (!payment) {
    payment = new Payment({
      orderId,
      userId: String(userId),
      amount: roundedAmount,
      currency: "vnd",
      paymentMethod: "PAYOS",
      status: "Pending",
      email: email || "customer@example.com",
      phone: phone || "+84901234567",
    });
  } else {
    payment.userId = String(userId);
    payment.amount = roundedAmount;
    payment.paymentMethod = "PAYOS";
    payment.status = "Pending";
    payment.payosCheckoutUrl = undefined;
  }
  payment.payosOrderCode = orderCode;
  await payment.save();

  try {
    const result = await payos.paymentRequests.create({
      orderCode,
      amount: roundedAmount,
      description: `SD${String(orderCode).slice(-7)}`,
      returnUrl: process.env.PAYOS_RETURN_URL || `${getFrontendUrl()}/payment/payos/callback`,
      cancelUrl: process.env.PAYOS_CANCEL_URL || `${getFrontendUrl()}/payment/payos/callback`,
    });
    payment.payosCheckoutUrl = result.checkoutUrl;
    await payment.save();
    return { checkoutUrl: result.checkoutUrl, orderId, amount: roundedAmount, provider: "PAYOS" };
  } catch (error) {
    payment.status = "Failed";
    await payment.save();
    throw error;
  }
}

async function verifyPayOSWebhook(payload) {
  const payos = createPayOSClient();
  const data = await payos.webhooks.verify(payload);
  const payment = await Payment.findOne({ payosOrderCode: Number(data.orderCode), paymentMethod: "PAYOS" });
  if (!payment) {
    return { isValid: true, isSuccess: false, ignored: true, orderCode: data.orderCode };
  }
  if (Math.round(Number(data.amount)) !== Math.round(Number(payment.amount))) {
    const error = new Error("Số tiền PayOS không khớp với đơn hàng.");
    error.statusCode = 400;
    throw error;
  }

  const status = payload.success && data.code === "00" ? "PAID" : "FAILED";
  const paymentStatus = await applyPayOSStatus(payment, status, payload, data.reference);
  return { isValid: true, isSuccess: paymentStatus === "Paid", orderId: payment.orderId, paymentStatus };
}

async function verifyPayOSReturn(orderCode) {
  const parsedOrderCode = Number(orderCode);
  if (!Number.isSafeInteger(parsedOrderCode) || parsedOrderCode <= 0) {
    const error = new Error("Mã giao dịch PayOS không hợp lệ.");
    error.statusCode = 400;
    throw error;
  }

  const payos = createPayOSClient();
  const payment = await Payment.findOne({ payosOrderCode: parsedOrderCode, paymentMethod: "PAYOS" });
  if (!payment) {
    const error = new Error("Không tìm thấy giao dịch PayOS.");
    error.statusCode = 404;
    throw error;
  }

  const result = await payos.paymentRequests.get(parsedOrderCode);
  if (Math.round(Number(result.amount)) !== Math.round(Number(payment.amount))) {
    const error = new Error("Số tiền PayOS không khớp với đơn hàng.");
    error.statusCode = 400;
    throw error;
  }
  if (result.status === "PAID" && Math.round(Number(result.amountPaid)) < Math.round(Number(payment.amount))) {
    const error = new Error("PayOS chưa xác nhận đủ số tiền của đơn hàng.");
    error.statusCode = 400;
    throw error;
  }

  const paymentStatus = await applyPayOSStatus(payment, result.status, result, result.transactions?.[0]?.reference);
  return {
    isValid: true,
    isSuccess: paymentStatus === "Paid",
    orderId: payment.orderId,
    amount: payment.amount,
    transactionId: payment.providerTransactionId || "",
    paymentStatus,
    message: paymentStatus === "Paid" ? "Thanh toán PayOS thành công!" : "Giao dịch PayOS chưa hoàn tất hoặc đã bị hủy.",
  };
}

module.exports = { createPayOSPayment, verifyPayOSWebhook, verifyPayOSReturn, applyPayOSStatus };