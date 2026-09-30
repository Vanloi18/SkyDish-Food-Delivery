import express from "express";
import { registerDriver, loginDriver, getDriverProfile } from "../controllers/authController.js";
import { updateDriverStatus } from "../controllers/driverController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerDriver);
router.post("/login", loginDriver);
router.get("/profile", authMiddleware, getDriverProfile);
router.put("/status", authMiddleware, updateDriverStatus);
router.patch("/status", authMiddleware, updateDriverStatus);

export default router;