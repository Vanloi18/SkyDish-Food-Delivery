const mongoose = require("mongoose");

const objectIdOrString = (value) => {
  const text = String(value || "");
  if (!text) return [];
  if (mongoose.Types.ObjectId.isValid(text)) {
    return [{ _id: new mongoose.Types.ObjectId(text) }, { _id: text }];
  }
  return [{ _id: text }];
};

const getOrderQuery = (orderId) => ({
  $or: [
    { orderGroupId: String(orderId) },
    ...objectIdOrString(orderId),
  ],
});

/**
 * Resolve the authoritative amount for a payment request.
 * The payment service shares MongoDB with Order Service, so it can validate
 * both single orders and a multi-restaurant checkout group before charging.
 */
async function getAuthorizedOrderGroup(orderId, authUser) {
  if (!orderId) {
    const error = new Error("Mã đơn hàng là bắt buộc.");
    error.statusCode = 400;
    throw error;
  }

  const db = mongoose.connection.db;
  if (!db) {
    const error = new Error("Database chưa sẵn sàng để xác thực thanh toán.");
    error.statusCode = 503;
    throw error;
  }

  const orders = await db.collection("orders").find(getOrderQuery(orderId)).toArray();
  if (!orders.length) {
    const error = new Error("Không tìm thấy đơn hàng cần thanh toán.");
    error.statusCode = 404;
    throw error;
  }

  const isAdmin = ["admin", "superAdmin"].includes(authUser?.role);
  if (!isAdmin && orders.some((order) => String(order.customerId) !== String(authUser?.id))) {
    const error = new Error("Bạn không có quyền thanh toán đơn hàng của người khác.");
    error.statusCode = 403;
    throw error;
  }

  const payableOrders = orders.filter((order) => order.status !== "Canceled");
  if (!payableOrders.length) {
    const error = new Error("Đơn hàng đã bị hủy và không thể thanh toán.");
    error.statusCode = 409;
    throw error;
  }

  return {
    orders: payableOrders,
    orderIds: payableOrders.map((order) => String(order._id)),
    amount: payableOrders.reduce((sum, order) => sum + Number(order.totalPrice || 0), 0),
  };
}

module.exports = { getAuthorizedOrderGroup, getOrderQuery };
