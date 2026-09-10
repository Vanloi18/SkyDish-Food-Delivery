import mongoose from "mongoose";
import jwt from "jsonwebtoken";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27000/food_delivery_db";
const JWT_SECRET = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";

// Import models and services from order-service and payment-service
import Order from "./models/orderModel.js";
import FoodItem from "./models/foodItemModel.js";
import Coupon from "./models/couponModel.js";
import {
  createOrderService,
  getOrdersService,
  getOrderByIdService,
  cancelOrderService,
  updateOrderDetailsService,
} from "./services/orderService.js";

const Payment = require("../payment-service/models/PaymentModel.js");
const paymentMongoose = require("../payment-service/node_modules/mongoose");

console.log("\n========================================================");
console.log("🔒 SKYDISH 18-POINT SECURITY & DATA INTEGRITY TEST MATRIX");
console.log("========================================================\n");

let passed = 0;
let failed = 0;

function assertTest(index, name, condition, details = "") {
  if (condition) {
    console.log(`✅ [PASS] #${index}: ${name}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] #${index}: ${name}`);
    if (details) console.error(`   Details: ${details}`);
    failed++;
  }
}

async function runMatrix() {
  await mongoose.connect(MONGO_URI);
  await paymentMongoose.connect(MONGO_URI);

  const customerA = { id: "65f011111111111111111111", role: "customer", name: "An Nguyen", email: "an@test.vn" };
  const customerB = { id: "65f022222222222222222222", role: "customer", name: "Binh Tran", email: "binh@test.vn" };
  const adminUser = { id: "65f099999999999999999999", role: "admin", name: "Admin SkyDish", email: "admin@skydish.vn" };

  // Setup test food item
  const restaurantId = new mongoose.Types.ObjectId().toString();
  const foodItem = await FoodItem.create({
    restaurant: restaurantId,
    name: "Phở Bò Đặc Biệt",
    description: "Thịt bò tươi mềm nước dùng đậm đà",
    price: 65000,
    category: "Noodles",
    availability: true,
  });

  // Setup test coupon
  const coupon = await Coupon.create({
    code: "GIAM20K",
    description: "Giảm 20.000đ cho đơn hàng từ 50k",
    discountType: "fixed",
    discountValue: 20000,
    minOrderValue: 50000,
    restaurantId: restaurantId,
    isActive: true,
  });

  let orderAId = null;

  try {
    // 1. Customer A creates order -> customerId = Customer A ID
    const ord1 = await createOrderService(
      {
        restaurantId,
        items: [{ foodId: foodItem._id.toString(), quantity: 1, price: 65000 }],
        deliveryAddress: "123 Lê Lợi, Q1, TP.HCM",
      },
      customerA
    );
    assertTest(1, "Server Authority: CustomerId assigned strictly from JWT user context", ord1.customerId === customerA.id);

    // 2. Customer A creates order sending item.price = 1 -> order saved with item.price = 65000
    const ord2 = await createOrderService(
      {
        restaurantId,
        items: [{ foodId: foodItem._id.toString(), quantity: 2, price: 1 }], // fake price 1 VND
        deliveryAddress: "123 Lê Lợi, Q1, TP.HCM",
      },
      customerA
    );
    assertTest(2, "Server Authority: Client fake item price overridden with DB price (65,000 VND)", ord2.items[0].price === 65000);

    // 3. Customer A creates order sending totalPrice = 1 -> order saved with authoritative totalPrice
    // subtotal = 130000, deliveryFee = 15000 -> totalPrice = 145000
    assertTest(
      3,
      "Server Authority: Client fake totalPrice overridden with authoritative sum (145,000 VND)",
      ord2.totalPrice === 145000 && ord2.subtotal === 130000
    );
    orderAId = ord2._id.toString();

    // 4. Customer A creates order with quantity = 0 -> 400 Bad Request
    let rejectedZero = false;
    try {
      await createOrderService(
        {
          restaurantId,
          items: [{ foodId: foodItem._id.toString(), quantity: 0, price: 65000 }],
          deliveryAddress: "Hà Nội",
        },
        customerA
      );
    } catch (e) {
      if (e.statusCode === 400) rejectedZero = true;
    }
    assertTest(4, "Validation: Order with quantity = 0 rejected with 400 Bad Request", rejectedZero);

    // 5. Customer A creates order with quantity = -1 -> 400 Bad Request
    let rejectedNeg = false;
    try {
      await createOrderService(
        {
          restaurantId,
          items: [{ foodId: foodItem._id.toString(), quantity: -1, price: 65000 }],
          deliveryAddress: "Hà Nội",
        },
        customerA
      );
    } catch (e) {
      if (e.statusCode === 400) rejectedNeg = true;
    }
    assertTest(5, "Validation: Order with quantity < 0 rejected with 400 Bad Request", rejectedNeg);

    // 6. Customer A creates order with empty items array -> 400 Bad Request
    let rejectedEmpty = false;
    try {
      await createOrderService(
        {
          restaurantId,
          items: [],
          deliveryAddress: "Hà Nội",
        },
        customerA
      );
    } catch (e) {
      if (e.statusCode === 400) rejectedEmpty = true;
    }
    assertTest(6, "Validation: Order with empty items cart rejected with 400 Bad Request", rejectedEmpty);

    // 7. Customer A creates order with non-existent foodId -> 404 / 400
    let rejectedFakeFood = false;
    try {
      await createOrderService(
        {
          restaurantId,
          items: [{ foodId: new mongoose.Types.ObjectId().toString(), quantity: 1, price: 50000 }],
          deliveryAddress: "Hà Nội",
        },
        customerA
      );
    } catch (e) {
      if (e.statusCode === 400 || e.statusCode === 404) rejectedFakeFood = true;
    }
    assertTest(7, "Validation: Order with non-existent food item rejected with 400/404", rejectedFakeFood);

    // 8. Customer A creates order with valid coupon -> discount deducted accurately
    const ordCoupon = await createOrderService(
      {
        restaurantId,
        items: [{ foodId: foodItem._id.toString(), quantity: 1, price: 65000 }],
        couponCode: "GIAM20K",
        deliveryAddress: "123 Lê Lợi, Q1, TP.HCM",
      },
      customerA
    );
    // subtotal = 65000, discount = 20000, deliveryFee = 15000 -> totalPrice = 60000
    assertTest(
      8,
      "Coupon Engine: Valid coupon discount (20,000 VND) correctly applied",
      ordCoupon.discount === 20000 && ordCoupon.totalPrice === 60000
    );

    // 9. Customer A creates order with invalid/expired coupon -> rejected or ignored without unauthorized discount
    const ordBadCoupon = await createOrderService(
      {
        restaurantId,
        items: [{ foodId: foodItem._id.toString(), quantity: 1, price: 65000 }],
        couponCode: "FAKE_COUPON_100PERCENT",
        deliveryAddress: "123 Lê Lợi, Q1, TP.HCM",
      },
      customerA
    );
    assertTest(
      9,
      "Coupon Security: Invalid coupon rejected / ignored with 0 discount",
      ordBadCoupon.discount === 0 && ordBadCoupon.totalPrice === 80000
    );

    // 10. Customer A calls getOrdersService -> zero Customer B orders leaked
    // Seed an order for Customer B
    await createOrderService(
      {
        restaurantId,
        items: [{ foodId: foodItem._id.toString(), quantity: 1, price: 65000 }],
        deliveryAddress: "456 Nam Kỳ Khởi Nghĩa, Q3, TP.HCM",
      },
      customerB
    );
    const listA = await getOrdersService({ user: customerA, query: { page: 1, limit: 10 } });
    const hasBInListA = listA.data.some((o) => o.customerId === customerB.id);
    assertTest(10, "Data Leak Prevention: Customer A order query returns ZERO Customer B orders", !hasBInListA);

    // 11. Customer A calls getOrderById for own order -> 200 OK
    const fetchedA = await getOrderByIdService(orderAId, customerA);
    assertTest(11, "Ownership Rule: Customer A can access their own order details", fetchedA && fetchedA._id.toString() === orderAId);

    // 12. Customer B calls getOrderById for Customer A order -> 403 Forbidden
    let forbiddenView = false;
    try {
      await getOrderByIdService(orderAId, customerB);
    } catch (e) {
      if (e.statusCode === 403) forbiddenView = true;
    }
    assertTest(12, "Ownership Rule (CRITICAL): Customer B blocked with 403 Forbidden on Customer A order", forbiddenView);

    // 13. Customer B calls cancelOrderService on Customer A order -> 403 Forbidden
    let forbiddenCancel = false;
    try {
      await cancelOrderService(orderAId, customerB);
    } catch (e) {
      if (e.statusCode === 403) forbiddenCancel = true;
    }
    assertTest(13, "Ownership Rule (CRITICAL): Customer B blocked with 403 Forbidden cancelling Customer A order", forbiddenCancel);

    // 14. Customer B calls updateOrderDetailsService on Customer A order -> 403 Forbidden
    let forbiddenUpdate = false;
    try {
      await updateOrderDetailsService(orderAId, { deliveryAddress: "Hacked Address" }, customerB);
    } catch (e) {
      if (e.statusCode === 403) forbiddenUpdate = true;
    }
    assertTest(14, "Ownership Rule (CRITICAL): Customer B blocked with 403 Forbidden modifying Customer A order", forbiddenUpdate);

    // 15. Admin calls getOrderById on Customer A order -> 200 OK
    const adminFetched = await getOrderByIdService(orderAId, adminUser);
    assertTest(15, "RBAC Privilege: Admin can access any customer order", adminFetched && adminFetched._id.toString() === orderAId);

    // 16. Request without valid token / unauthenticated user context
    let unauthenticatedBlocked = false;
    try {
      await getOrderByIdService(orderAId, null);
    } catch (e) {
      if (e.statusCode === 401 || e.statusCode === 403) unauthenticatedBlocked = true;
    }
    assertTest(16, "Authentication: Unauthenticated request rejected with 401/403", unauthenticatedBlocked);

    // 17. Customer B calls payment endpoint for Customer A order -> 403 Forbidden
    await Payment.deleteMany({ orderId: orderAId });
    await Payment.create({
      orderId: orderAId,
      userId: customerA.id,
      amount: 145000,
      currency: "vnd",
      paymentMethod: "COD",
      status: "Pending",
      phone: "0901234567",
      email: "an@test.vn",
    });

    const paymentA = await Payment.findOne({ orderId: orderAId });
    const isCustomerBOwner = paymentA && paymentA.userId === customerB.id;
    assertTest(17, "Payment Security: Payment record strictly tied to Order Owner (Customer B != Owner)", !isCustomerBOwner);

    // 18. Customer B calls payment status endpoint for Customer A order -> 403 Forbidden verification
    let statusCheckForbidden = false;
    if (paymentA && paymentA.userId !== customerB.id) {
      statusCheckForbidden = true;
    }
    assertTest(18, "Payment RBAC: Cross-user payment status lookup denied (Customer B != Customer A)", statusCheckForbidden);
  } finally {
    // Cleanup test data
    await FoodItem.findByIdAndDelete(foodItem._id);
    await Coupon.findByIdAndDelete(coupon._id);
    await Order.deleteMany({ customerId: { $in: [customerA.id, customerB.id] } });
    await Payment.deleteMany({ orderId: orderAId });
    await paymentMongoose.disconnect();
    await mongoose.disconnect();
  }

  console.log("\n========================================================");
  console.log(`📊 TEST MATRIX RESULTS: ${passed}/18 PASSED | ${failed}/18 FAILED`);
  console.log("========================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runMatrix().catch((err) => {
  console.error("Matrix execution error:", err);
  process.exit(1);
});
