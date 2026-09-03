/**
 * Extended analytics routes — MP, Vendor, Longitudinal, Geocoding.
 * Mounted alongside the existing analytics routes in routes/index.ts.
 */
import { Router } from "express";
import { mpaController } from "../controllers/mpaController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── MP analytics ───────────────────────────────────────────────────────────────

router.get("/mp-summary", authorize("ADMIN", "ANALYST", "OFFICER", "MP"), mpaController.mpSummary);
router.get("/mp/:id/trends", authorize("ADMIN", "ANALYST", "OFFICER", "MP"), mpaController.mpTrends);

// ── Vendor analytics ─────────────────────────────────────────────────────────

router.get("/vendor-summary", authorize("ADMIN", "ANALYST", "OFFICER"), mpaController.vendorSummary);
router.get("/vendor-top", authorize("ADMIN", "ANALYST", "OFFICER"), mpaController.vendorTop);

// ── Longitudinal ──────────────────────────────────────────────────────────────

router.get("/longitudinal", authorize("ADMIN", "ANALYST"), mpaController.longitudinal);

export default router;
