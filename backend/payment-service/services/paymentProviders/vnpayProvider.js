const crypto = require("crypto");
const Payment = require("../../models/PaymentModel");

/**
 * Format Date as YYYYMMDDHHmmss (Vietnam GMT+7)
 */
function getVNPayDateFormat(date = new Date()) {
  const vnOffset = 7 * 60; // GMT+7 in minutes
  const utc = date.getTime() + date.getTimezoneOffset() * 60000;
  const vnDate = new Date(utc + vnOffset * 60000);

  const pad = (n) => (n < 10 ? "0" + n : n);
  const year = vnDate.getFullYear();
  const month = pad(vnDate.getMonth() + 1);
  const day = pad(vnDate.getDate());
  const hours = pad(vnDate.getHours());
  const minutes = pad(vnDate.getMinutes());
  const seconds = pad(vnDate.getSeconds());

  return `${year}${month}${day}${hours}${minutes}${seconds}`;
}

/**
 * Build sorted query string according to VNPay official specification
 */
function buildVNPaySignData(obj) {
  const sortedKeys = Object.keys(obj).sort();
  const pairs = [];
  for (const key of sortedKeys) {
    const val = obj[key];
    if (val !== undefined && val !== null && val !== "") {
      pairs.push(`${encodeURIComponent(key)}=${encodeURIComponent(String(val)).replace(/%20/g, "+")}`);
    }
  }
  return pairs.join("&");
}

/**
 * Create VNPay Payment URL
 */
async function createVNPayUrl({
  orderId,
  userId,
  amount,
  email,
  phone,
  bankCode,
  language = "vn",
  ipAddr = "127.0.0.1",
}) {
  if (process.env.VNPAY_ENABLED !== "true") {
    const error = new Error("VNPay is not enabled.");
    error.status = 503;
    throw error;
  }

  const tmnCode = process.env.VNPAY_TMN_CODE || "";
  const secretKey = process.env.VNPAY_HASH_SECRET || "";
  const vnpUrl = process.env.VNPAY_PAYMENT_URL || "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
  const returnUrl = process.env.VNPAY_RETURN_URL || "http://localhost:3000/payment/vnpay/callback";
  const version = process.env.VNPAY_VERSION || "2.1.0";

  if (!tmnCode || !secretKey) {
    const error = new Error("VNPay credentials are not configured.");
    error.status = 503;
    throw error;
  }

  if (!userId || userId === "GUEST") {
    const error = new Error("Unauthorized: Guest payments are strictly prohibited. Please login.");
    error.status = 401;
    throw error;
  }

  // Check if existing payment is already paid
  let payment = await Payment.findOne({ orderId });
  if (payment && payment.status === "Paid") {
    return {
      message: "✅ This order has already been paid successfully.",
      paymentStatus: "Paid",
      disablePayment: true,
    };
  }

  // VNPay expects amount multiplied by 100 (in VND)
  const vnpAmount = Math.round(Number(amount) * 100);
  const createDate = getVNPayDateFormat();

  const vnp_Params = {
    vnp_Version: version,
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: language || "vn",
    vnp_CurrCode: "VND",
    vnp_TxnRef: orderId,
    vnp_OrderInfo: `Thanh toan don hang SkyDish ${orderId}`,
    vnp_OrderType: "other",
    vnp_Amount: vnpAmount,
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || "127.0.0.1",
    vnp_CreateDate: createDate,
  };

  if (bankCode && bankCode.trim() !== "") {
    vnp_Params["vnp_BankCode"] = bankCode;
  }

  const signData = buildVNPaySignData(vnp_Params);
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const paymentUrl = `${vnpUrl}?${signData}&vnp_SecureHash=${signed}`;

  // Save or update Payment record
  if (!payment) {
    payment = new Payment({
      orderId,
      userId: String(userId),
      amount,
      currency: "vnd",
      paymentMethod: "VNPAY",
      status: "Pending",
      email: email || "customer@example.com",
      phone: phone || "+84901234567",
      providerTransactionId: orderId,
    });
  } else {
    payment.paymentMethod = "VNPAY";
    payment.status = "Pending";
  }
  await payment.save();

  return {
    paymentUrl,
    orderId,
    amount,
    provider: "VNPAY",
  };
}

/**
 * Verify VNPay Return / Callback
 */
async function verifyVNPayReturn(queryParams) {
  const vnp_Params = { ...queryParams };
  const secureHash = vnp_Params["vnp_SecureHash"];

  delete vnp_Params["vnp_SecureHash"];
  delete vnp_Params["vnp_SecureHashType"];

  const secretKey = process.env.VNPAY_HASH_SECRET || "";
  const signData = buildVNPaySignData(vnp_Params);
  const hmac = crypto.createHmac("sha512", secretKey);
  const signed = hmac.update(Buffer.from(signData, "utf-8")).digest("hex");

  const orderId = vnp_Params["vnp_TxnRef"];
  const responseCode = vnp_Params["vnp_ResponseCode"];
  const transactionNo = vnp_Params["vnp_TransactionNo"];
  const bankCode = vnp_Params["vnp_BankCode"];
  const amount = Number(vnp_Params["vnp_Amount"]) / 100;

  if (secureHash !== signed) {
    return {
      isValid: false,
      isSuccess: false,
      message: "Chữ ký không hợp lệ (Invalid checksum signature)",
      orderId,
      responseCode,
    };
  }

  const isSuccess = responseCode === "00";
  const paymentStatus = isSuccess ? "Paid" : "Failed";

  // Update Payment record in MongoDB
  let payment = await Payment.findOne({ orderId });
  if (payment) {
    payment.status = paymentStatus;
    payment.providerTransactionId = transactionNo || orderId;
    payment.providerResponse = vnp_Params;
    await payment.save();
  }

  return {
    isValid: true,
    isSuccess,
    orderId,
    amount,
    transactionNo,
    bankCode,
    responseCode,
    message: isSuccess
      ? "Thanh toán VNPay thành công!"
      : `Giao dịch VNPay thất bại hoặc bị hủy (Mã lỗi: ${responseCode})`,
  };
}

async function processVNPayIpn(queryParams) {
  const result = await verifyVNPayReturn(queryParams);
  return {
    RspCode: result.isValid ? "00" : "97",
    Message: result.isValid ? "Confirm Success" : "Invalid signature",
    result,
  };
}

module.exports = {
  createVNPayUrl,
  verifyVNPayReturn,
  processVNPayIpn,
  buildVNPaySignData,
};
