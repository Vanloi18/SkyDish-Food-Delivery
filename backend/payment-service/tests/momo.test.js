const test = require("node:test");
const assert = require("node:assert");
const crypto = require("crypto");
const mongoose = require("mongoose");
const request = require("supertest");
const jwt = require("jsonwebtoken");

process.env.JWT_SECRET = "supersecretjwtkeyforfooddeliverymicroservices2025";
process.env.MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/food_delivery_db";
process.env.NODE_ENV = "test";
process.env.MOMO_PARTNER_CODE = "MOMO_TEST_PARTNER_01";
process.env.MOMO_ACCESS_KEY = "MOMO_TEST_ACCESS_KEY_01";
process.env.MOMO_SECRET_KEY = "MOMO_TEST_SECRET_KEY_01_SECURE";
process.env.MOMO_ENDPOINT = "https://test-payment.momo.vn/v2/gateway/api/create";
process.env.MOMO_REDIRECT_URL = "http://localhost:3000/payment/momo/callback";
process.env.MOMO_IPN_URL = "http://localhost:5004/api/payment/momo/ipn";

const Payment = require("../models/PaymentModel");
const app = require("../server");
const {
  calculateMoMoCreateSignature,
  calculateMoMoCallbackSignature,
  getMoMoConfig,
  verifyMoMoNotification,
} = require("../services/paymentProviders/momoProvider");

const customerToken = jwt.sign(
  { id: "customer_momo_test", role: "customer", email: "cust_momo@test.com" },
  process.env.JWT_SECRET
);

test.before(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGO_URI);
  }
  await Payment.deleteMany({ orderId: { $regex: /^TEST_MOMO_/ } });
  const db = mongoose.connection.db;
  if (db) {
    await db.collection("orders").deleteMany({ _id: { $regex: /^TEST_MOMO_/ } });
  }
});

test.after(async () => {
  await Payment.deleteMany({ orderId: { $regex: /^TEST_MOMO_/ } });
  const db = mongoose.connection.db;
  if (db) {
    await db.collection("orders").deleteMany({ _id: { $regex: /^TEST_MOMO_/ } });
  }
  await mongoose.disconnect();
  setTimeout(() => process.exit(0), 100);
});

test("1. HMAC-SHA256 create signature calculation matches MoMo v2 alphabetical specification", () => {
  const params = {
    accessKey: "testAccessKey",
    secretKey: "testSecretKey",
    amount: 50000,
    extraData: "",
    ipnUrl: "https://example.com/ipn",
    orderId: "ORDER_123",
    orderInfo: "Thanh toan don hang ORDER_123",
    partnerCode: "MOMO_PARTNER",
    redirectUrl: "https://example.com/redirect",
    requestId: "REQ_123",
    requestType: "captureWallet",
  };

  const expectedRaw = `accessKey=testAccessKey&amount=50000&extraData=&ipnUrl=https://example.com/ipn&orderId=ORDER_123&orderInfo=Thanh toan don hang ORDER_123&partnerCode=MOMO_PARTNER&redirectUrl=https://example.com/redirect&requestId=REQ_123&requestType=captureWallet`;
  const expectedSig = crypto.createHmac("sha256", "testSecretKey").update(expectedRaw).digest("hex");

  const actualSig = calculateMoMoCreateSignature(params);
  assert.strictEqual(actualSig, expectedSig);
});

test("2. HMAC-SHA256 callback signature calculation matches MoMo v2 alphabetical specification", () => {
  const params = {
    accessKey: "testAccessKey",
    secretKey: "testSecretKey",
    amount: 50000,
    extraData: "",
    message: "Success",
    orderId: "ORDER_123",
    orderInfo: "Thanh toan don hang ORDER_123",
    orderType: "momo_wallet",
    partnerCode: "MOMO_PARTNER",
    payType: "qr",
    requestId: "REQ_123",
    responseTime: 1710672000000,
    resultCode: 0,
    transId: "23456789",
  };

  const expectedRaw = `accessKey=testAccessKey&amount=50000&extraData=&message=Success&orderId=ORDER_123&orderInfo=Thanh toan don hang ORDER_123&orderType=momo_wallet&partnerCode=MOMO_PARTNER&payType=qr&requestId=REQ_123&responseTime=1710672000000&resultCode=0&transId=23456789`;
  const expectedSig = crypto.createHmac("sha256", "testSecretKey").update(expectedRaw).digest("hex");

  const actualSig = calculateMoMoCallbackSignature(params);
  assert.strictEqual(actualSig, expectedSig);
});

test("3. Reject MoMo callback when signature is invalid (Tampered request)", async () => {
  const orderId = "TEST_MOMO_INVALID_SIG";
  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount: 100000,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Pending",
    email: "test@example.com",
    phone: "0901234567",
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId: `${orderId}_1`,
      amount: 100000,
      orderInfo: "Thanh toan don hang",
      orderType: "momo_wallet",
      transId: "999999",
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime: Date.now(),
      extraData: "",
      signature: "tampered_fake_signature_hex_12345",
    });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.isValid, false);
  assert.match(res.body.error, /Signature mismatch/);

  // Ensure DB record remained Pending and was NOT changed to Paid
  const checkPayment = await Payment.findOne({ orderId });
  assert.strictEqual(checkPayment.status, "Pending");
});

test("4. Reject MoMo callback when orderId does not exist", async () => {
  const orderId = "TEST_MOMO_NON_EXISTENT_ORDER";
  const amount = 50000;
  const requestId = `${orderId}_req`;
  const responseTime = Date.now();

  const validSig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount,
    extraData: "",
    message: "Success",
    orderId,
    orderInfo: "Thanh toan",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 0,
    transId: "123456",
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount,
      orderInfo: "Thanh toan",
      orderType: "momo_wallet",
      transId: "123456",
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: validSig,
    });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.isValid, false);
  assert.match(res.body.error, /Không tìm thấy bản ghi thanh toán/);
});

test("5. Reject MoMo callback when amount does not match order record", async () => {
  const orderId = "TEST_MOMO_AMOUNT_MISMATCH";
  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount: 150000,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Pending",
    email: "test@example.com",
    phone: "0901234567",
  });

  const tamperedAmount = 50000; // Trying to pay 50k for a 150k order
  const requestId = `${orderId}_req`;
  const responseTime = Date.now();

  const sig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount: tamperedAmount,
    extraData: "",
    message: "Success",
    orderId,
    orderInfo: "Thanh toan",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 0,
    transId: "123456",
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount: tamperedAmount,
      orderInfo: "Thanh toan",
      orderType: "momo_wallet",
      transId: "123456",
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: sig,
    });

  assert.strictEqual(res.status, 400);
  assert.strictEqual(res.body.isValid, false);
  assert.match(res.body.error, /Số tiền thanh toán không khớp/);

  const checkPayment = await Payment.findOne({ orderId });
  assert.strictEqual(checkPayment.status, "Pending");
});

test("6. Successful callback updates Payment status to Paid and synchronizes Order status", async () => {
  const orderId = "TEST_MOMO_SUCCESS_SYNC";
  const amount = 85000;

  // Create initial order in orders collection
  const db = mongoose.connection.db;
  if (db) {
    await db.collection("orders").insertOne({
      _id: orderId,
      customerId: "customer_momo_test",
      totalPrice: amount,
      paymentMethod: "MOMO",
      paymentStatus: "Pending",
      status: "Pending",
      deliveryAddress: "123 Le Loi, Da Nang",
    });
  }

  // Create initial Payment record
  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Pending",
    email: "test@example.com",
    phone: "0901234567",
  });

  const requestId = `${orderId}_req`;
  const responseTime = Date.now();
  const transId = "MOMO_TXN_998877";

  const sig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount,
    extraData: "",
    message: "Success",
    orderId,
    orderInfo: "Thanh toan don hang",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 0,
    transId,
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount,
      orderInfo: "Thanh toan don hang",
      orderType: "momo_wallet",
      transId,
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: sig,
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.isValid, true);
  assert.strictEqual(res.body.isSuccess, true);
  assert.strictEqual(res.body.orderId, orderId);

  // Verify Payment record was updated to Paid
  const updatedPayment = await Payment.findOne({ orderId });
  assert.strictEqual(updatedPayment.status, "Paid");
  assert.strictEqual(updatedPayment.providerTransactionId, transId);

  // Verify Order record was synchronized to Confirmed and Paid
  if (db) {
    const updatedOrder = await db.collection("orders").findOne({ _id: orderId });
    assert.strictEqual(updatedOrder.paymentStatus, "Paid");
    assert.strictEqual(updatedOrder.status, "Confirmed");
  }
});

test("7. Idempotency: repeated callback does not recreate or corrupt payment/order", async () => {
  const orderId = "TEST_MOMO_IDEMPOTENT";
  const amount = 99000;
  const transId = "MOMO_TXN_IDEMPOTENT_1";

  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Paid", // Already paid
    email: "test@example.com",
    phone: "0901234567",
    providerTransactionId: transId,
  });

  const requestId = `${orderId}_req2`;
  const responseTime = Date.now();

  const sig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount,
    extraData: "",
    message: "Success",
    orderId,
    orderInfo: "Thanh toan don hang",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 0,
    transId,
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount,
      orderInfo: "Thanh toan don hang",
      orderType: "momo_wallet",
      transId,
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: sig,
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.isValid, true);
  assert.strictEqual(res.body.isAlreadyPaid, true);

  const count = await Payment.countDocuments({ orderId });
  assert.strictEqual(count, 1);
});

test("8. Failed / cancelled MoMo payment updates Payment status to Failed and syncs Order", async () => {
  const orderId = "TEST_MOMO_CANCELLED";
  const amount = 120000;

  const db = mongoose.connection.db;
  if (db) {
    await db.collection("orders").insertOne({
      _id: orderId,
      customerId: "customer_momo_test",
      totalPrice: amount,
      paymentMethod: "MOMO",
      paymentStatus: "Pending",
      status: "Pending",
      deliveryAddress: "456 Tran Phu, Da Nang",
    });
  }

  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Pending",
    email: "test@example.com",
    phone: "0901234567",
  });

  const requestId = `${orderId}_req`;
  const responseTime = Date.now();
  const transId = "MOMO_TXN_CANCELLED";

  // MoMo resultCode 1006: User cancelled transaction
  const sig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount,
    extraData: "",
    message: "Giao dịch bị hủy bởi người dùng",
    orderId,
    orderInfo: "Thanh toan don hang",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 1006,
    transId,
  });

  const res = await request(app)
    .get("/api/payment/momo/callback")
    .query({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount,
      orderInfo: "Thanh toan don hang",
      orderType: "momo_wallet",
      transId,
      resultCode: 1006,
      message: "Giao dịch bị hủy bởi người dùng",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: sig,
    });

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.isValid, true);
  assert.strictEqual(res.body.isSuccess, false);

  const updatedPayment = await Payment.findOne({ orderId });
  assert.strictEqual(updatedPayment.status, "Failed");

  if (db) {
    const updatedOrder = await db.collection("orders").findOne({ _id: orderId });
    assert.strictEqual(updatedOrder.paymentStatus, "Failed");
  }
});

test("9. MoMo IPN returns HTTP 204 No Content upon valid notification as per MoMo v2 spec", async () => {
  const orderId = "TEST_MOMO_IPN_204";
  const amount = 70000;

  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Pending",
    email: "test@example.com",
    phone: "0901234567",
  });

  const requestId = `${orderId}_ipn_req`;
  const responseTime = Date.now();
  const transId = "MOMO_IPN_TXN_1";

  const sig = calculateMoMoCallbackSignature({
    accessKey: process.env.MOMO_ACCESS_KEY,
    secretKey: process.env.MOMO_SECRET_KEY,
    amount,
    extraData: "",
    message: "Success",
    orderId,
    orderInfo: "Thanh toan qua IPN",
    orderType: "momo_wallet",
    partnerCode: process.env.MOMO_PARTNER_CODE,
    payType: "qr",
    requestId,
    responseTime,
    resultCode: 0,
    transId,
  });

  const res = await request(app)
    .post("/api/payment/momo/ipn")
    .send({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      orderId,
      requestId,
      amount,
      orderInfo: "Thanh toan qua IPN",
      orderType: "momo_wallet",
      transId,
      resultCode: 0,
      message: "Success",
      payType: "qr",
      responseTime,
      extraData: "",
      signature: sig,
    });

  // Must acknowledge with 204 No Content
  assert.strictEqual(res.status, 204);

  const updatedPayment = await Payment.findOne({ orderId });
  assert.strictEqual(updatedPayment.status, "Paid");
});

test("10. Payment status API endpoint returns synchronized status without leaking Secret Key", async () => {
  const orderId = "TEST_MOMO_SECURITY_STATUS";
  await Payment.create({
    orderId,
    userId: "customer_momo_test",
    amount: 50000,
    currency: "vnd",
    paymentMethod: "MOMO",
    status: "Paid",
    email: "test@example.com",
    phone: "0901234567",
  });

  const res = await request(app)
    .get(`/api/payment/status/${orderId}`)
    .set("Authorization", `Bearer ${customerToken}`);

  assert.strictEqual(res.status, 200);
  assert.strictEqual(res.body.orderId, orderId);
  assert.strictEqual(res.body.status, "Paid");
  assert.strictEqual(res.body.paymentMethod, "MOMO");
  assert.strictEqual(res.body.secretKey, undefined);
  assert.strictEqual(res.body.MOMO_SECRET_KEY, undefined);
});
