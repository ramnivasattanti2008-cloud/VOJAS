import { Router } from "express";
import { locationController } from "../controllers/locationController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Map overview (must come before /:id to avoid route conflict) ─────────────
router.get("/map/overview", locationController.mapOverview);

// ── Per-project locations ────────────────────────────────────────────────────
router.get("/project/:projectId", locationController.getByProject);

// ── CRUD ─────────────────────────────────────────────────────────────────────
// List & detail — any authenticated user
router.get("/", locationController.list);
router.get("/:id", locationController.getOne);

// Create — ADMIN and OFFICER only
router.post(
  "/",
  authorize("ADMIN", "OFFICER"),
  locationController.create
);

// Update — ADMIN and OFFICER only
router.put(
  "/:id",
  authorize("ADMIN", "OFFICER"),
  locationController.update
);

// Verify — REVIEWER and ADMIN only (so officers don't verify their own data)
router.post(
  "/:id/verify",
  authorize("REVIEWER", "ADMIN"),
  locationController.verify
);

// Delete — ADMIN only
router.delete(
  "/:id",
  authorize("ADMIN"),
  locationController.remove
);

export default router;
