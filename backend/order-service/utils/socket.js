let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;

export const emitOrderCreated = (order) => {
  if (!ioInstance) return;
  ioInstance.to(`restaurant:${order.restaurantId}`).emit('new-order', order);
  ioInstance.to(`customer:${order.customerId}`).emit('new-order', order);
};

export const emitOrderUpdated = (order) => {
  if (!ioInstance) return;
  const payload = { orderId: order._id.toString(), status: order.status, order };
  ioInstance.to(`restaurant:${order.restaurantId}`).emit('updateOrder', payload);
  ioInstance.to(`customer:${order.customerId}`).emit('updateOrder', payload);
};
