import { Router } from "express";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { adminController } from "../controllers/adminController.js";

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, authorize("ADMIN"));

// System stats
router.get("/stats", asyncHandler(adminController.getStats));

// User management
router.get("/users",             asyncHandler(adminController.listUsers));
router.post("/users",            asyncHandler(adminController.createUser));
router.put("/users/:id",         asyncHandler(adminController.updateUser));
router.delete("/users/:id",      asyncHandler(adminController.deleteUser));

// Anomaly rule management
router.get("/anomaly-rules",             asyncHandler(adminController.listAnomalyRules));
router.put("/anomaly-rules/:id",         asyncHandler(adminController.updateAnomalyRule));

// Audit logs
router.get("/audit-logs",          asyncHandler(adminController.listAuditLogs));

export default router;
