import express from "express";
import {
  getAllDrivers,
  getDriverById,
  updateDriverStatus,
  updateDriverProfile,
  deleteDriver,
} from "../controllers/driverController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Lấy danh sách tất cả tài xế (Admin)
router.get("/", authMiddleware, authorizeRoles("admin", "superadmin"), getAllDrivers);

// Cập nhật trạng thái làm việc (Online/Offline) của tài xế đang đăng nhập
router.patch("/status", authMiddleware, updateDriverStatus);
router.put("/status", authMiddleware, updateDriverStatus);

// Cập nhật profile của tài xế đang đăng nhập
router.put("/profile", authMiddleware, updateDriverProfile);

// Lấy thông tin chi tiết một tài xế theo ID
router.get("/:id", authMiddleware, getDriverById);

// Cập nhật trạng thái tài xế theo ID
router.put("/:id/status", authMiddleware, updateDriverStatus);

// Cập nhật thông tin tài xế theo ID
router.put("/:id", authMiddleware, updateDriverProfile);

// Xóa tài xế (Admin)
router.delete("/:id", authMiddleware, authorizeRoles("admin", "superadmin"), deleteDriver);

export default router;
