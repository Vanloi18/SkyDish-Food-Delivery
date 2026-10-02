import express from "express";

import { registerDriver, loginDriver, getDriverProfile } from "../controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerDriver);
router.post("/login", loginDriver);
router.get("/profile", authMiddleware, getDriverProfile);

export default router;