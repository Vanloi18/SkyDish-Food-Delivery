const Payment = require("../../models/PaymentModel");
const stripeKey = process.env.STRIPE_SECRET_KEY || "sk_test_placeholder_key_skydish_dev";
const stripe = require("stripe")(stripeKey);
const { sendSmsNotification } = require("../../utils/twilioService");

/**
 * Process Stripe PaymentIntent creation or retrieval
 */
async function processStripePayment({ orderId, userId, amount, currency, email, phone }) {
  if (!userId || userId === "GUEST") {
    throw { status: 401, message: "Unauthorized: Guest payments are strictly prohibited. Please login." };
  }

  if (!phone) {
    throw { status: 400, message: "Phone number is required." };
  }

  // Idempotency: Check if a payment record already exists for this order
  let payment = await Payment.findOne({ orderId });
  if (payment && payment.stripeClientSecret) {
    if (payment.status === "Paid") {
      return {
        message: "✅ This order has already been paid successfully.",
        paymentStatus: "Paid",
        disablePayment: true,
      };
    }
    return {
      clientSecret: payment.stripeClientSecret,
      paymentId: payment._id,
      disablePayment: false,
    };
  }

  const targetCurrency = (currency || "vnd").toLowerCase();
  const isZeroDecimal = targetCurrency === "vnd" || targetCurrency === "jpy" || targetCurrency === "krw";
  const stripeAmount = isZeroDecimal ? Math.round(Number(amount)) : Math.round(parseFloat(amount) * 100);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: stripeAmount,
    currency: targetCurrency,
    metadata: { orderId, userId, paymentMethod: "STRIPE" },
    receipt_email: email,
  });

  payment = new Payment({
    orderId,
    userId,
    amount,
    currency: targetCurrency,
    paymentMethod: "STRIPE",
    status: "Pending",
    stripePaymentIntentId: paymentIntent.id,
    stripeClientSecret: paymentIntent.client_secret,
    phone,
    email,
  });

  await payment.save();

  try {
    const message = `Your Stripe payment intent for Order ${orderId} has been initialized.`;
    await sendSmsNotification(phone, message);
  } catch (smsErr) {
    console.warn("SMS notification notice:", smsErr.message);
  }

  return {
    clientSecret: paymentIntent.client_secret,
    paymentId: payment._id,
    disablePayment: false,
  };
}

module.exports = {
  processStripePayment,
};
