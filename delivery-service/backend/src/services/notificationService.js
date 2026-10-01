import Notification from "../models/Notification.js";
import { getIO } from "../utils/socket.js";

/**
 * Gửi và lưu trữ thông báo giao vận vào cơ sở dữ liệu MongoDB
 * Đồng thời đẩy socket realtime nếu kết nối Socket.IO đang sẵn sàng
 */
export const sendDeliveryNotification = async ({
  userId,
  role = "customer",
  title,
  message,
  entityId = "",
  type = "delivery",
}) => {
  try {
    if (!userId || !title || !message) return null;

    const notif = await Notification.create({
      userId: String(userId),
      role,
      type,
      title,
      message,
      entityType: "delivery",
      entityId: String(entityId),
      isRead: false,
    });

    // Thử emit socket realtime nếu IO đã được khởi tạo
    try {
      const io = getIO();
      if (io) {
        io.to(String(userId)).emit("delivery-notification", notif);
      }
    } catch (wsErr) {
      // Bỏ qua lỗi socket khi server test hoặc socket chưa gắn
    }

    return notif;
  } catch (error) {
    console.warn("⚠️ Notification service warning:", error.message);
    return null;
  }
};

/**
 * 1. Thông báo khi Delivery được tạo
 */
export const notifyDeliveryCreated = async (delivery, driver = null) => {
  const tasks = [];

  // Thông báo cho Customer
  if (delivery.customerId) {
    tasks.push(
      sendDeliveryNotification({
        userId: delivery.customerId,
        role: "customer",
        title: "Đơn giao hàng mới đã được khởi tạo",
        message: `Chuyến giao hàng cho đơn #${delivery.orderId} đang được hệ thống điều phối tài xế.`,
        entityId: delivery._id,
      })
    );
  }

  // Nếu đã có driver ngay khi tạo
  if (driver && driver._id) {
    tasks.push(
      sendDeliveryNotification({
        userId: driver._id,
        role: "delivery",
        title: "Bạn có đơn giao hàng mới!",
        message: `Mã đơn #${delivery.orderId} đã được phân công cho bạn. Điểm nhận: ${delivery.pickupAddressString}.`,
        entityId: delivery._id,
      })
    );
  }

  return Promise.all(tasks);
};

/**
 * 2. Thông báo khi Driver được gán (assign) vào Delivery
 */
export const notifyDriverAssigned = async (delivery, driver) => {
  const tasks = [];

  if (driver && driver._id) {
    tasks.push(
      sendDeliveryNotification({
        userId: driver._id,
        role: "delivery",
        title: "Đơn giao hàng mới được gán cho bạn",
        message: `Bạn được chỉ định giao đơn #${delivery.orderId}. Điểm nhận: ${delivery.pickupAddressString}.`,
        entityId: delivery._id,
      })
    );
  }

  if (delivery.customerId) {
    const driverName = driver?.name || "Tài xế SkyDish";
    tasks.push(
      sendDeliveryNotification({
        userId: delivery.customerId,
        role: "customer",
        title: "Tài xế đã nhận đơn giao hàng",
        message: `${driverName} đã nhận đơn #${delivery.orderId} và đang di chuyển tới nhà hàng lấy đồ ăn.`,
        entityId: delivery._id,
      })
    );
  }

  return Promise.all(tasks);
};

/**
 * 3. Thông báo khi trạng thái Delivery thay đổi
 */
export const notifyDeliveryStatusChanged = async (delivery, newStatus, driver = null) => {
  const tasks = [];
  const statusMessages = {
    "Picked-up": "Tài xế đã lấy món ăn từ nhà hàng và đang trên đường giao tới bạn.",
    "To be delivered": "Tài xế đang di chuyển tới địa chỉ nhận hàng của bạn.",
    "Delivered": "Đơn hàng đã được giao thành công! Chúc bạn bữa ăn ngon miệng cùng SkyDish.",
  };

  const customerMsg = statusMessages[newStatus] || `Đơn hàng #${delivery.orderId} đã chuyển sang trạng thái: ${newStatus}`;

  // Thông báo tới Khách hàng
  if (delivery.customerId) {
    tasks.push(
      sendDeliveryNotification({
        userId: delivery.customerId,
        role: "customer",
        title: newStatus === "Delivered" ? "Giao hàng thành công 🎉" : `Cập nhật đơn hàng: ${newStatus}`,
        message: customerMsg,
        entityId: delivery._id,
      })
    );
  }

  // Thông báo tới Tài xế khi hoàn tất
  const targetDriverId = delivery.driver?._id || delivery.driver;
  if (targetDriverId && newStatus === "Delivered") {
    tasks.push(
      sendDeliveryNotification({
        userId: targetDriverId,
        role: "delivery",
        title: "Hoàn tất chuyến giao hàng",
        message: `Chúc mừng bạn đã hoàn thành giao đơn hàng #${delivery.orderId}!`,
        entityId: delivery._id,
      })
    );
  }

  return Promise.all(tasks);
};
