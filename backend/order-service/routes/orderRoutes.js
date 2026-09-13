import express from "express";
import {
    createOrder,
    getOrders,
    getOrderById,
    updateOrderStatus,
    cancelOrder,
    updateOrderDetails
} from "../controllers/orderController.js";

import { protect, authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "order-service", timestamp: new Date().toISOString() }));

// Customers and Admins can create orders
router.post("/", protect, authorizeRoles("customer", "admin"), createOrder);

// All authenticated roles (customer, restaurant, driver, admin) access orders scoped by ownership
router.get("/", protect, getOrders);
router.get("/:id", protect, getOrderById);

// Update order status or details (verified by role and ownership)
router.patch("/:id/status", protect, updateOrderStatus);
router.patch("/:id", protect, updateOrderDetails);

// Cancel order (verified by ownership)
router.delete("/:id", protect, cancelOrder);

export default router;
