import { Router } from "express";
import { projectController } from "../controllers/projectController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public listing & detail — any authenticated user
router.get("/",              asyncHandler(projectController.list));
router.get("/stats",        asyncHandler(projectController.stats));
router.get("/:id",          asyncHandler(projectController.getOne));

// Create — ADMIN and OFFICER only
router.post(
  "/",
  authorize("ADMIN", "OFFICER"),
  asyncHandler(projectController.create)
);

// Update — ADMIN and OFFICER only
router.put(
  "/:id",
  authorize("ADMIN", "OFFICER"),
  asyncHandler(projectController.update)
);

// Delete — ADMIN only
router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(projectController.remove)
);

// Phase 13: PDF report export — OFFICER / ADMIN / ANALYST
router.get(
  "/:id/report/pdf",
  authorize("ADMIN", "OFFICER", "ANALYST"),
  asyncHandler(projectController.exportPDF)
);

export default router;
