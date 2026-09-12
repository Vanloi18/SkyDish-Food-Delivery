const Payment = require("../../models/PaymentModel");
const axios = require("axios");

/**
 * Helper to get bank transfer config from environment
 */
function getBankTransferConfig() {
  return {
    enabled: process.env.BANK_TRANSFER_ENABLED !== "false",
    bankId: process.env.BANK_ID || "970422",
    bankCode: process.env.BANK_CODE || "MB",
    bankName: process.env.BANK_NAME || "MB Bank",
    accountNumber: process.env.BANK_ACCOUNT_NUMBER || "0932366523",
    accountHolder: process.env.BANK_ACCOUNT_NAME || "LE VAN LOI",
    template: process.env.VIETQR_TEMPLATE || "compact2",
  };
}

/**
 * Generate Real VietQR Quick Link URL according to official VietQR standard
 */
function generateVietQRUrl({ bankId, accountNumber, template, amount, paymentRef, accountHolder }) {
  const cleanBankId = bankId || "970422";
  const cleanAccountNo = accountNumber || "0932366523";
  const cleanTemplate = template || "compact2";
  const numAmount = Math.max(0, Math.round(Number(amount) || 0));
  const encodedRef = encodeURIComponent(paymentRef || "");
  const encodedName = encodeURIComponent(accountHolder || "LE VAN LOI");

  return `https://img.vietqr.io/image/${cleanBankId}-${cleanAccountNo}-${cleanTemplate}.png?amount=${numAmount}&addInfo=${encodedRef}&accountName=${encodedName}`;
}

/**
 * 1. Initialize Bank Transfer / VietQR Payment
 */
async function createBankTransferPayment({
  orderId,
  userId,
  amount,
  currency = "vnd",
  email,
  phone,
  items,
  restaurantId,
  deliveryAddress,
}) {
  if (!orderId) {
    throw { status: 400, message: "Order ID is required." };
  }

  const config = getBankTransferConfig();
  const validAmount = Math.max(0, Math.round(Number(amount) || 0));
  // Normalize payment note for VietQR: preserve letters, digits, dashes, and underscores
  const safeOrderCode = String(orderId).replace(/[^a-zA-Z0-9_-]/g, "");
  const paymentRef = `SKYDISH-${safeOrderCode}`;

  const qrUrl = generateVietQRUrl({
    bankId: config.bankId,
    accountNumber: config.accountNumber,
    template: config.template,
    amount: validAmount,
    paymentRef,
    accountHolder: config.accountHolder,
  });

  const bankDetails = {
    bankCode: config.bankCode,
    bankName: config.bankName,
    accountNumber: config.accountNumber,
    accountHolder: config.accountHolder,
    paymentRef,
    qrUrl,
  };

  // Idempotency: Check if a payment record already exists for this order
  let payment = await Payment.findOne({ orderId });
  if (payment) {
    if (payment.status === "Paid") {
      return {
        message: "✅ Đơn hàng này đã được thanh toán thành công.",
        paymentStatus: "Paid",
        disablePayment: true,
        orderId,
        amount: payment.amount,
        bankDetails: payment.bankDetails || bankDetails,
      };
    }

    payment.paymentMethod = "BANK_TRANSFER";
    payment.amount = validAmount;
    payment.status = "Pending";
    payment.bankDetails = bankDetails;
    if (email) payment.email = email;
    if (phone) payment.phone = phone;
    await payment.save();
  } else {
    payment = new Payment({
      orderId,
      userId: userId || "GUEST",
      amount: validAmount,
      currency: currency || "vnd",
      paymentMethod: "BANK_TRANSFER",
      status: "Pending",
      email: email || "customer@example.com",
      phone: phone || "+84901234567",
      bankDetails,
      providerTransactionId: `VIETQR_${orderId}`,
    });
    await payment.save();
  }

  // Synchronize order with Order Service if items are provided
  if (items && items.length > 0) {
    try {
      await axios.post("http://127.0.0.1:5005/api/orders", {
        customerId: userId,
        restaurantId: restaurantId || "restaurant_1",
        items,
        totalPrice: validAmount,
        paymentMethod: "BANK_TRANSFER",
        paymentStatus: "Pending",
        deliveryAddress: deliveryAddress || "Hà Nội",
      }, { timeout: 3000 });
    } catch (orderErr) {
      console.warn("Order service sync notice (Bank Transfer):", orderErr.message);
    }
  }

  return {
    success: true,
    orderId,
    amount: validAmount,
    paymentMethod: "BANK_TRANSFER",
    paymentStatus: "Pending",
    bankDetails,
    qrUrl,
    instructions: [
      "1. Mở ứng dụng ngân hàng hoặc ví điện tử hỗ trợ VietQR.",
      "2. Chọn tính năng 'Quét mã QR' và hướng camera vào mã bên dưới.",
      "3. Kiểm tra số tiền và nội dung chuyển khoản chính xác.",
      "4. Xác nhận chuyển khoản và nhấn 'Tôi đã chuyển khoản'.",
    ],
  };
}

/**
 * 2. Record customer reported transfer intent (Keeps status Pending)
 */
async function confirmCustomerTransfer({ orderId }) {
  if (!orderId) {
    throw { status: 400, message: "Order ID is required." };
  }

  const payment = await Payment.findOne({ orderId });
  if (!payment) {
    throw { status: 404, message: "Không tìm thấy thông tin đơn thanh toán." };
  }

  if (payment.status === "Paid") {
    return {
      orderId,
      paymentStatus: "Paid",
      message: "Đơn hàng đã được xác nhận thanh toán thành công!",
    };
  }

  payment.customerReportedTransfer = true;
  payment.transferReportedAt = new Date();
  await payment.save();

  return {
    orderId,
    paymentStatus: "Pending",
    customerReportedTransfer: true,
    message:
      "Đã ghi nhận thông báo chuyển khoản của bạn. Đơn hàng sẽ được tự động kích hoạt sau khi hệ thống đối soát giao dịch thành công.",
  };
}

/**
 * 3. Authoritative Bank Webhook / Transaction Verification
 */
async function verifyBankTransactionWebhook({
  receivingAccount,
  amount,
  paymentRef,
  transactionId,
  bankCode,
}) {
  const config = getBankTransferConfig();

  // Validate receiving account
  if (receivingAccount && receivingAccount.trim() !== config.accountNumber.trim()) {
    return {
      isValid: false,
      isSuccess: false,
      message: `Tài khoản nhận tiền không hợp lệ. Kỳ vọng: ${config.accountNumber}, Nhận được: ${receivingAccount}`,
    };
  }

  // Extract orderId from paymentRef (e.g. SKYDISH-ORDER12345 or ORDER12345)
  let matchedOrderId = "";
  if (paymentRef) {
    const cleaned = String(paymentRef).trim().toUpperCase();
    if (cleaned.startsWith("SKYDISH-")) {
      matchedOrderId = cleaned.replace("SKYDISH-", "");
    } else if (cleaned.startsWith("ORDER")) {
      matchedOrderId = cleaned;
    }
  }

  if (!matchedOrderId) {
    return {
      isValid: false,
      isSuccess: false,
      message: "Nội dung chuyển khoản không chứa mã đơn hàng hợp lệ.",
    };
  }

  // Find payment record matching orderId
  const payment = await Payment.findOne({
    $or: [{ orderId: matchedOrderId }, { orderId: `ORDER${matchedOrderId}` }, { orderId: new RegExp(`^${matchedOrderId}$`, "i") }],
  });

  if (!payment) {
    return {
      isValid: false,
      isSuccess: false,
      message: `Không tìm thấy đơn hàng tương ứng với mã ${matchedOrderId}.`,
    };
  }

  // Validate transaction amount
  const receivedAmount = Math.round(Number(amount) || 0);
  const expectedAmount = Math.round(Number(payment.amount) || 0);

  if (receivedAmount < expectedAmount) {
    return {
      isValid: false,
      isSuccess: false,
      orderId: payment.orderId,
      message: `Số tiền chuyển khoản (${receivedAmount.toLocaleString("vi-VN")} ₫) thấp hơn giá trị đơn hàng (${expectedAmount.toLocaleString("vi-VN")} ₫).`,
    };
  }

  // Mark as Paid
  payment.status = "Paid";
  payment.providerTransactionId = transactionId || `TXN_${Date.now()}`;
  payment.providerResponse = {
    verifiedAt: new Date(),
    receivingAccount,
    receivedAmount,
    bankCode: bankCode || config.bankCode,
    transactionId,
  };
  await payment.save();

  // Synchronize Order Service
  try {
    await axios.patch(`http://127.0.0.1:5005/api/orders/${payment.orderId}`, {
      status: "Confirmed",
      paymentStatus: "Paid",
    }, { timeout: 3000 });
  } catch (err) {
    console.warn("Order service status update notice:", err.message);
  }

  return {
    isValid: true,
    isSuccess: true,
    orderId: payment.orderId,
    amount: payment.amount,
    transactionId: payment.providerTransactionId,
    message: "Xác thực thanh toán chuyển khoản ngân hàng thành công!",
  };
}

module.exports = {
  getBankTransferConfig,
  generateVietQRUrl,
  createBankTransferPayment,
  confirmCustomerTransfer,
  verifyBankTransactionWebhook,
};
