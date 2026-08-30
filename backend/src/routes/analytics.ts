import { Router } from "express";
import { analyticsController } from "../controllers/analyticsController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// GET /analytics/summary — full chart data (ADMIN, ANALYST)
router.get(
  "/summary",
  authorize("ADMIN", "ANALYST"),
  asyncHandler(analyticsController.summary)
);

// GET /analytics/dashboard — lightweight role-specific stats
router.get(
  "/dashboard",
  asyncHandler(analyticsController.dashboard)
);

export default router;
