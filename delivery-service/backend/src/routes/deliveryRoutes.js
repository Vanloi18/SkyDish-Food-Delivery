import express from "express";
import { createDelivery, getAvailableOrders, getDriverDeliveries, getDelivery, updateDeliveryStatus, deleteDelivery, getDeliveryByOrderId, updateDriverAvailability, updateDriverLocation } from "../controllers/deliveryController.js";
import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";


const router = express.Router();

router.get("/health", (req, res) => res.status(200).json({ status: "ok", service: "delivery-service", timestamp: new Date().toISOString() }));

router.get("/order/:orderId", authMiddleware, getDeliveryByOrderId);
router.get("/available", authMiddleware, authorizeRoles('driver'), getAvailableOrders);
router.put("/driver/availability", authMiddleware, authorizeRoles('driver'), updateDriverAvailability);
router.put("/driver/location", authMiddleware, authorizeRoles('driver'), updateDriverLocation);
router.post("/create", authMiddleware, authorizeRoles('driver'), createDelivery);
router.get("/", authMiddleware, authorizeRoles('driver'), getDriverDeliveries);
router.get("/:id", authMiddleware, authorizeRoles('driver', 'admin'), getDelivery);
router.put("/:id/status", authMiddleware, authorizeRoles('driver', 'admin'), updateDeliveryStatus);
router.delete("/:id", authMiddleware, authorizeRoles('driver', 'admin'), deleteDelivery);

export default router;
