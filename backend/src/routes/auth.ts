import { Router } from "express";
import { authController } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authLimiter } from "../middleware/rateLimit.js";

const router = Router();

// All auth routes are rate-limited
router.post("/register", authLimiter, asyncHandler(authController.register));
router.post("/login",   authLimiter, asyncHandler(authController.login));
router.post("/logout",  authLimiter, authenticate, asyncHandler(authController.logout));
router.get("/me", authenticate, asyncHandler(authController.me));

export default router;
