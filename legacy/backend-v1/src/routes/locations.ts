import { Router } from "express";
import { locationController } from "../controllers/locationController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Map overview (must come before /:id to avoid route conflict) ─────────────
router.get("/map/overview", asyncHandler(locationController.mapOverview));

// ── Per-project locations ────────────────────────────────────────────────────
router.get("/project/:projectId", asyncHandler(locationController.getByProject));

// ── CRUD ─────────────────────────────────────────────────────────────────────
// List & detail — any authenticated user
router.get("/", asyncHandler(locationController.list));
router.get("/:id", asyncHandler(locationController.getOne));

// Create — ADMIN and OFFICER only
router.post(
  "/",
  authorize("ADMIN", "OFFICER"),
  asyncHandler(locationController.create)
);

// Update — ADMIN and OFFICER only
router.put(
  "/:id",
  authorize("ADMIN", "OFFICER"),
  asyncHandler(locationController.update)
);

// Verify — REVIEWER and ADMIN only (so officers don't verify their own data)
router.post(
  "/:id/verify",
  authorize("REVIEWER", "ADMIN"),
  asyncHandler(locationController.verify)
);

// Delete — ADMIN only
router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(locationController.remove)
);

export default router;
