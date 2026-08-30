import { Router } from "express";
import { anomalyController } from "../controllers/anomalyController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// List & stats — any authenticated user
router.get("/",        asyncHandler(anomalyController.list));
router.get("/stats",  asyncHandler(anomalyController.stats));

// Rules — any authenticated user (read), ADMIN to modify
router.get("/rules",            asyncHandler(anomalyController.listRules));
router.patch("/rules/:id",     authorize("ADMIN", "ANALYST"), asyncHandler(anomalyController.updateRule));

// Trigger scan — ANALYST or above
router.post("/scan", authorize("ADMIN", "ANALYST", "REVIEWER"), asyncHandler(anomalyController.scan));

// Detail — any authenticated user
router.get("/:id", asyncHandler(anomalyController.getOne));

// Lifecycle actions — ANALYST or above
router.post("/:id/acknowledge", authorize("ADMIN", "ANALYST", "REVIEWER"), asyncHandler(anomalyController.acknowledge));
router.post("/:id/resolve",     authorize("ADMIN", "ANALYST", "REVIEWER"), asyncHandler(anomalyController.resolve));

export default router;
