const mongoose = require("mongoose");
const axios = require("axios");
const jwt = require("jsonwebtoken");
const { getOrderQuery } = require("./orderAuthorization");

async function syncOrdersByPayment(orderId, { paymentStatus, status, cancellationReason } = {}) {
  const db = mongoose.connection.db;
  if (!db) return;

  const ordersCollection = db.collection("orders");
  const query = getOrderQuery(orderId);
  const update = {
    $set: {
      paymentStatus,
      ...(status ? { status } : {}),
      ...(cancellationReason ? { cancellationReason } : {}),
      updatedAt: new Date(),
    },
  };

  const orders = await ordersCollection.find(query).project({ _id: 1 }).toArray();
  if (!orders.length) return;
  await ordersCollection.updateMany(query, update);

  const orderServiceUrl = process.env.ORDER_SERVICE_URL || "http://order-service:5005";
  const jwtSecret = process.env.JWT_SECRET || "supersecretjwtkeyforfooddeliverymicroservices2025";
  const systemToken = jwt.sign({ id: "system_payment", role: "admin" }, jwtSecret, { expiresIn: "1h" });

  if (status) {
    await Promise.all(orders.map(({ _id }) => axios.patch(
      `${orderServiceUrl}/api/orders/${_id.toString()}/status`,
      { status, ...(cancellationReason ? { cancellationReason } : {}) },
      { headers: { Authorization: `Bearer ${systemToken}` }, timeout: 3000 }
    ).catch((error) => console.warn("Order status sync notice:", error.message))));
  }
}

module.exports = { syncOrdersByPayment };
