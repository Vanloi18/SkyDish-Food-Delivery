import express from "express";
import {
  getDeliveryOverviewStats,
  getDriverPersonalStats,
} from "../controllers/statisticsController.js";
import { authMiddleware, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

// Báo cáo tổng quan giao vận (Admin / SuperAdmin)
router.get("/overview", authMiddleware, authorizeRoles("admin", "superadmin"), getDeliveryOverviewStats);

// Thống kê cá nhân cho tài xế đang đăng nhập
router.get("/driver", authMiddleware, getDriverPersonalStats);

export default router;
