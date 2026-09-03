import { Router } from "express";
import { riskController } from "../controllers/riskController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Static routes first (before /:projectId to avoid conflict)
router.get("/stats",         asyncHandler(riskController.stats));
router.get("/",              asyncHandler(riskController.list));
router.post("/recalculate",  authorize("ADMIN", "OFFICER", "ANALYST"), asyncHandler(riskController.recalculateAll));

// Per-project routes
router.get("/:projectId",              asyncHandler(riskController.getOne));
router.post("/:projectId/recalculate", authorize("ADMIN", "OFFICER", "ANALYST"), asyncHandler(riskController.recalculateOne));

export default router;
