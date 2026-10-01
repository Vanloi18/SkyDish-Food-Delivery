import express from "express";
import {
  createDelivery,
  getDriverDeliveries,
  getDelivery,
  updateDeliveryStatus,
  assignDriverToDelivery,
  getDeliveriesByDriver,
  getDeliveryByOrderId,
  deleteDelivery,
} from "../controllers/deliveryController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Kiểm tra sức khỏe dịch vụ
router.get("/health", (req, res) =>
  res.status(200).json({
    status: "ok",
    service: "delivery-service",
    timestamp: new Date().toISOString(),
  })
);

// Tạo mới chuyến giao hàng
router.post("/create", authMiddleware, createDelivery);

// Tra cứu theo mã đơn hàng
router.get("/order/:orderId", authMiddleware, getDeliveryByOrderId);

// Lấy danh sách chuyến giao của một tài xế cụ thể (Admin hoặc chính tài xế)
router.get("/driver/:driverId", authMiddleware, getDeliveriesByDriver);

// Route tường minh dành cho Admin xem toàn bộ chuyến giao
router.get("/admin/all", authMiddleware, authorizeRoles("admin", "superadmin"), getDriverDeliveries);

// Lấy danh sách giao hàng (Driver xem đơn của mình, Admin xem tất cả)
router.get("/", authMiddleware, getDriverDeliveries);

// Lấy chi tiết đơn giao hàng
router.get("/:id", authMiddleware, getDelivery);

// Cập nhật trạng thái giao hàng
router.put("/:id/status", authMiddleware, updateDeliveryStatus);

// Gán / Điều phối tài xế cho đơn giao hàng (Admin hoặc Auto-assign)
router.put("/:id/assign", authMiddleware, authorizeRoles("admin", "superadmin"), assignDriverToDelivery);
router.post("/:id/assign", authMiddleware, authorizeRoles("admin", "superadmin"), assignDriverToDelivery);

// Xóa đơn giao hàng (khi đã Delivered hoặc Admin)
router.delete("/:id", authMiddleware, deleteDelivery);

export default router;
