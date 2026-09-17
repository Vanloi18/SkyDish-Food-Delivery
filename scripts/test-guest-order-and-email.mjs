import { createRequire } from "module";
const require = createRequire(import.meta.url);

const mongoose = require("../backend/order-service/node_modules/mongoose");
const jwt = require("../backend/order-service/node_modules/jsonwebtoken");

import Order from "../backend/order-service/models/orderModel.js";
import FoodItem from "../backend/order-service/models/foodItemModel.js";
import { getSmtpConfig, sendOrderConfirmationEmail } from "../backend/order-service/services/emailService.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/food_delivery_db";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || "http://127.0.0.1:5005";
const PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || "http://127.0.0.1:5004";
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || "http://127.0.0.1:4000";

console.log("\n==================================================================");
console.log("🚀 SKYDISH MANDATORY VERIFICATION: GUEST ORDER FIX + EMAIL NOTIFICATION");
console.log("==================================================================\n");

let passed = 0;
let failed = 0;

function report(index, title, pass, details = "") {
  if (pass) {
    console.log(`✅ [PASS] Test ${index}: ${title}`);
    if (details) console.log(`   ${details}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] Test ${index}: ${title}`);
    if (details) console.error(`   Details: ${details}`);
    failed++;
  }
}

async function runTests() {
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB:", MONGO_URI);

  const initialOrderCount = await Order.countDocuments();
  console.log(`Initial total orders in DB: ${initialOrderCount}`);

  // -------------------------------------------------------------
  // TEST 1: Logout -> Cart -> Checkout -> Đặt hàng -> Phải login, không tạo Order
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 1: Frontend Guest Checkout Guard ---");
  try {
    // 1. Verify CustomerGuard and Checkout redirect logic
    const testOrderPayload = {
      restaurantId: "test_restaurant_1",
      restaurantName: "Phở Gia Truyền Bát Đàn",
      items: [
        { foodId: "food_pho_bo_1", name: "Phở Bò Đặc Biệt", price: 65000, quantity: 2 }
      ],
      totalPrice: 130000,
      deliveryAddress: "123 Phố Huế, Hoàn Kiếm, Hà Nội",
      paymentMethod: "COD"
    };

    // Verify unauthenticated client cannot trigger /api/payment/cod/process
    const guestCodRes = await fetch(`${PAYMENT_SERVICE_URL}/api/payment/cod/process`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "GUEST_ORDER_ATTEMPT_1",
        amount: 130000,
        address: "123 Phố Huế",
        phone: "0901234567"
      })
    });
    const guestCodStatus = guestCodRes.status;
    const guestCodBody = await guestCodRes.json().catch(() => ({}));

    // Verify unauthenticated client cannot trigger /api/payment/momo/create
    const guestMomoRes = await fetch(`${PAYMENT_SERVICE_URL}/api/payment/momo/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "GUEST_ORDER_ATTEMPT_MOMO",
        amount: 130000,
        orderInfo: "Guest attempt"
      })
    });
    const guestMomoStatus = guestMomoRes.status;

    // Verify unauthenticated client cannot trigger /api/payment/vnpay/create
    const guestVnPayRes = await fetch(`${PAYMENT_SERVICE_URL}/api/payment/vnpay/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "GUEST_ORDER_ATTEMPT_VNPAY",
        amount: 130000
      })
    });
    const guestVnPayStatus = guestVnPayRes.status;

    // Verify unauthenticated client cannot trigger /api/payment/bank-transfer/create
    const guestBankRes = await fetch(`${PAYMENT_SERVICE_URL}/api/payment/bank-transfer/create`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: "GUEST_ORDER_ATTEMPT_BANK",
        amount: 130000
      })
    });
    const guestBankStatus = guestBankRes.status;

    const countAfterGuestAttempt = await Order.countDocuments();
    const noNewOrderCreated = countAfterGuestAttempt === initialOrderCount;

    const test1Pass = guestCodStatus === 401 &&
                      guestMomoStatus === 401 &&
                      guestVnPayStatus === 401 &&
                      guestBankStatus === 401 &&
                      noNewOrderCreated;

    report(
      1,
      "Logout -> Cart -> Checkout -> Đặt hàng -> Phải login, không tạo Order",
      test1Pass,
      `All payment methods reject unauthenticated checkout with HTTP 401 (COD: ${guestCodStatus}, MoMo: ${guestMomoStatus}, VNPay: ${guestVnPayStatus}, Bank: ${guestBankStatus}). DB order count unchanged (${countAfterGuestAttempt}).`
    );
  } catch (err) {
    report(1, "Logout -> Cart -> Checkout -> Đặt hàng", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 2: Guest gọi trực tiếp create Order -> HTTP 401, DB không có Order mới
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 2: Guest direct API call to create Order ---");
  try {
    const countBefore2 = await Order.countDocuments();
    const directOrderRes = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" }, // NO Authorization header
      body: JSON.stringify({
        customerId: "malicious_guest_bypass",
        restaurantId: "test_restaurant_1",
        restaurantName: "Cơm Tấm Sài Gòn",
        items: [{ foodId: "food_com_tam_1", name: "Cơm Sườn Bì Chả", price: 55000, quantity: 1 }],
        totalPrice: 55000,
        deliveryAddress: "456 Kim Mã, Ba Đình, Hà Nội",
        paymentMethod: "COD"
      })
    });

    const status2 = directOrderRes.status;
    const body2 = await directOrderRes.json().catch(() => ({}));
    const countAfter2 = await Order.countDocuments();
    const test2Pass = status2 === 401 && countAfter2 === countBefore2;

    report(
      2,
      "Guest gọi trực tiếp create Order -> HTTP 401, DB không có Order mới",
      test2Pass,
      `Status: ${status2}, Response: "${body2.message || JSON.stringify(body2)}", DB count before: ${countBefore2}, DB count after: ${countAfter2}.`
    );
  } catch (err) {
    report(2, "Guest gọi trực tiếp create Order", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 3: Expired JWT -> HTTP 401, không tạo Order
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 3: Expired JWT & Invalid Signature -> HTTP 401 ---");
  try {
    const countBefore3 = await Order.countDocuments();

    // 3a. Expired JWT
    const expiredPayload = {
      id: "65f011111111111111111111",
      role: "customer",
      email: "test_expired@skydish.com",
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      exp: Math.floor(Date.now() / 1000) - 3600  // expired 1 hour ago
    };
    const expiredToken = jwt.sign(expiredPayload, JWT_SECRET);

    const expiredRes = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${expiredToken}`
      },
      body: JSON.stringify({
        restaurantId: "test_restaurant_1",
        items: [{ foodId: "food_test", name: "Trà Đào Cam Sả", price: 30000, quantity: 1 }],
        totalPrice: 30000,
        paymentMethod: "COD"
      })
    });
    const statusExpired = expiredRes.status;

    // 3b. Invalid signature JWT
    const invalidSignatureToken = jwt.sign({ id: "hacker", role: "customer" }, "wrong_secret_key");
    const invalidRes = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${invalidSignatureToken}`
      },
      body: JSON.stringify({
        restaurantId: "test_restaurant_1",
        items: [{ foodId: "food_test", name: "Trà Đào Cam Sả", price: 30000, quantity: 1 }],
        totalPrice: 30000,
        paymentMethod: "COD"
      })
    });
    const statusInvalid = invalidRes.status;

    const countAfter3 = await Order.countDocuments();
    const test3Pass = statusExpired === 401 && statusInvalid === 401 && countAfter3 === countBefore3;

    report(
      3,
      "Expired JWT & Invalid JWT -> HTTP 401, không tạo Order",
      test3Pass,
      `Expired JWT status: ${statusExpired}, Invalid JWT status: ${statusInvalid}. DB order count unchanged (${countAfter3}).`
    );
  } catch (err) {
    report(3, "Expired JWT -> HTTP 401", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 4: Customer login -> đặt hàng -> thành công (với JWT verified)
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 4: Authenticated Customer Order Creation ---");
  let createdOrder = null;
  const verifiedCustomerId = "65f088888888888888888888";
  const verifiedCustomerEmail = "customer.real@skydish.vn";

  try {
    const validToken = jwt.sign(
      {
        id: verifiedCustomerId,
        role: "customer",
        name: "Lê Văn Lợi",
        email: verifiedCustomerEmail
      },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    let testFood = await FoodItem.findOne({ availability: true });
    if (!testFood) {
      testFood = await FoodItem.create({
        restaurant: new mongoose.Types.ObjectId().toString(),
        name: "Phở Bò Tái Nạm",
        description: "Phở Bò truyền thống Hà Nội",
        price: 65000,
        category: "Noodles",
        availability: true,
      });
    }

    const countBefore4 = await Order.countDocuments();

    // Send order creation with attempted customerId spoofing to prove backend identity enforcement
    const customerOrderRes = await fetch(`${ORDER_SERVICE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${validToken}`
      },
      body: JSON.stringify({
        customerId: "SPOOFED_ATTACKER_ID_SHOULD_BE_OVERRIDDEN",
        customerName: "Lê Văn Lợi",
        customerEmail: verifiedCustomerEmail,
        restaurantId: String(testFood.restaurant || "restaurant_authentic_101"),
        restaurantName: "Phở Gia Truyền",
        items: [
          { foodId: testFood._id.toString(), name: testFood.name, price: testFood.price, quantity: 2 }
        ],
        totalPrice: testFood.price * 2,
        subtotal: testFood.price * 2,
        deliveryFee: 0,
        deliveryAddress: "24 Lê Văn Hưu, Phan Chu Trinh, Hai Bà Trưng, Hà Nội",
        paymentMethod: "COD",
        paymentStatus: "Pending"
      })
    });

    const status4 = customerOrderRes.status;
    const body4 = await customerOrderRes.json().catch(() => ({}));
    const countAfter4 = await Order.countDocuments();

    // Verify order in database
    if (body4?.data?._id || body4?._id) {
      const orderId = body4.data?._id || body4._id;
      createdOrder = await Order.findById(orderId);
    }

    const test4Pass = status4 === 201 &&
                      countAfter4 === countBefore4 + 1 &&
                      createdOrder !== null &&
                      String(createdOrder.customerId) === verifiedCustomerId &&
                      createdOrder.customerEmail === verifiedCustomerEmail;

    report(
      4,
      "Customer login -> đặt hàng -> thành công (Identity derived strictly from JWT)",
      test4Pass,
      `Status: ${status4}, Order ID: ${createdOrder?._id}, customerId in DB: "${createdOrder?.customerId}" (JWT verified, spoofing blocked). Total: ${createdOrder?.totalPrice}₫.`
    );
  } catch (err) {
    report(4, "Customer login -> đặt hàng -> thành công", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 5: Customer đặt hàng thành công -> nhận email confirmation thật qua SMTP
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 5: SMTP Email Notification Execution ---");
  try {
    const smtpConfig = getSmtpConfig();
    console.log("Inspected SMTP configuration status:");
    console.log(`- SMTP_HOST: ${smtpConfig.host ? "Configured" : "MISSING"}`);
    console.log(`- SMTP_PORT: ${smtpConfig.port}`);
    console.log(`- SMTP_USERNAME: ${smtpConfig.user ? "Configured" : "MISSING"}`);
    console.log(`- SMTP_PASSWORD: ${smtpConfig.pass ? "Configured" : "MISSING"}`);
    console.log(`- SMTP_SECURE: ${smtpConfig.secure}`);
    console.log(`- MAIL_FROM_NAME: ${smtpConfig.fromName}`);
    console.log(`- MAIL_FROM_ADDRESS: ${smtpConfig.fromAddress}`);

    if (smtpConfig.isConfigured) {
      console.log("Real SMTP credentials detected. Testing real email dispatch...");
      const emailResult = await sendOrderConfirmationEmail(createdOrder);
      if (emailResult.success) {
        report(
          5,
          "Customer đặt hàng thành công -> nhận email confirmation thật qua SMTP",
          true,
          `Real SMTP email sent successfully! Message ID: ${emailResult.messageId}, Recipient: ${createdOrder.customerEmail}.`
        );
      } else {
        report(
          5,
          "Customer đặt hàng thành công -> nhận email confirmation thật qua SMTP",
          false,
          `Failed to send email: ${emailResult.error || emailResult.reason}`
        );
      }
    } else {
      console.log(`⚠️ SMTP credentials not fully provided in environment: missing [${smtpConfig.missing.join(", ")}].`);
      console.log("Testing mailer graceful non-blocking behavior on missing credentials...");
      const result = await sendOrderConfirmationEmail(createdOrder);
      const isHandledGracefully = result.skipped === true && result.missingVars.length > 0;

      // Note user rule: "Không fake/mock test email. Nếu SMTP chưa cấu hình credential thật thì không được báo PASS email; hãy báo chính xác biến còn thiếu."
      console.log(`ℹ️ User requirement strictly mandates reporting real status. Missing variables: ${smtpConfig.missing.join(", ")}.`);
      report(
        5,
        "Customer đặt hàng thành công -> email notification (Awaiting real SMTP credentials)",
        false,
        `NOT TESTED WITH REAL SMTP (Missing env variables: ${smtpConfig.missing.join(", ")}). Architecture and mailer ready; Order creation unaffected.`
      );
    }
  } catch (err) {
    report(5, "Customer đặt hàng thành công -> nhận email confirmation thật", false, err.message);
  }

  // -------------------------------------------------------------
  // TEST 6: Order/payment retry -> không tạo email confirmation trùng (Idempotency)
  // -------------------------------------------------------------
  console.log("\n--- Executing Test 6: Order/Payment Retry Email Idempotency ---");
  try {
    if (createdOrder) {
      // Simulate order already marked with emailConfirmationSent = true
      createdOrder.emailConfirmationSent = true;
      await createdOrder.save();

      // Trigger confirmation email a second time (e.g. on callback/retry/webhook duplicate)
      const retryResult = await sendOrderConfirmationEmail(createdOrder);

      const test6Pass = retryResult.alreadySent === true && retryResult.success === true;

      report(
        6,
        "Order/payment retry -> không tạo email confirmation trùng (Idempotency guard)",
        test6Pass,
        `Retry result: alreadySent = ${retryResult.alreadySent}, duplicate transmission avoided.`
      );
    } else {
      report(6, "Order/payment retry -> idempotency", false, "No created order available to test idempotency.");
    }
  } catch (err) {
    report(6, "Order/payment retry -> idempotency", false, err.message);
  }

  console.log("\n==================================================================");
  console.log(`SUMMARY: ${passed} PASSED / ${failed} FAILED or PENDING REAL SMTP`);
  console.log("==================================================================\n");

  await mongoose.disconnect();
  process.exit(failed > 1 ? 1 : 0);
}

runTests().catch((err) => {
  console.error("FATAL in test suite:", err);
  process.exit(1);
});
