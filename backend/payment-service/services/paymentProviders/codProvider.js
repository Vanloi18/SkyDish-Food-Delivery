const Payment = require("../../models/PaymentModel");
const axios = require("axios");

/**
 * Process Cash on Delivery (COD) order & payment record
 */
async function processCodPayment({
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
  if (!phone) {
    throw { status: 400, message: "Phone number is required for Cash on Delivery." };
  }

  // Enforce authenticated identity - Guests strictly forbidden
  if (!userId || userId === "GUEST") {
    throw { status: 401, message: "Vui lòng đăng nhập để đặt hàng." };
  }

  // Idempotency: Check if a payment record already exists for this order
  let payment = await Payment.findOne({ orderId });
  if (payment) {
    if (payment.status === "Paid") {
      return {
        message: "✅ This order has already been paid successfully.",
        paymentStatus: "Paid",
        disablePayment: true,
      };
    }
    return {
      orderId,
      paymentId: payment._id,
      paymentMethod: "COD",
      paymentStatus: payment.status,
      message: "Order placed. Payment will be collected in cash upon delivery.",
    };
  }

  payment = new Payment({
    orderId,
    userId: String(userId),
    amount,
    currency: currency || "vnd",
    paymentMethod: "COD",
    status: "Pending",
    phone,
    email: email || "customer@example.com",
    providerTransactionId: `COD_${orderId}`,
  });

  await payment.save();

  // Synchronize with Order Service if items and restaurantId are provided
  if (items && items.length > 0) {
    try {
      const jwt = require("jsonwebtoken");
      const orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://127.0.0.1:5005";
      const jwtSecret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
      const systemToken = jwt.sign({ id: String(userId), role: "customer" }, jwtSecret, { expiresIn: "1h" });
      await axios.post(
        `${orderServiceUrl}/api/orders`,
        {
          customerId: String(userId),
          restaurantId: restaurantId || "restaurant_1",
          items,
          totalPrice: amount,
          paymentMethod: "COD",
          paymentStatus: "Pending",
          deliveryAddress: deliveryAddress || "Customer Address",
        },
        {
          headers: { Authorization: `Bearer ${systemToken}` },
          timeout: 3000,
        }
      );
    } catch (orderErr) {
      console.warn("Order service sync notice:", orderErr.message);
    }
  }

  return {
    success: true,
    orderId,
    paymentId: payment._id,
    paymentMethod: "COD",
    paymentStatus: "Pending",
    message: "Your order has been placed! You will pay cash upon delivery.",
  };
}

module.exports = {
  processCodPayment,
};
