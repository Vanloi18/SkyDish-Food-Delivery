import express from "express";

import { registerDriver, loginDriver, getDriverProfile } from "../controllers/authController.js";
import authMiddleware, { authorizeRoles } from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/register", registerDriver);
router.post("/login", loginDriver);
router.get("/profile", authMiddleware, authorizeRoles('driver'), getDriverProfile);

export default router;
