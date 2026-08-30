import { Router } from "express";
import { reportController } from "../controllers/reportController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { getReportUpload } from "../utils/storage.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { reportSubmitLimiter } from "../middleware/rateLimit.js";

const router = Router();
const reportUpload = getReportUpload();

// ── Public submission (no auth) ──────────────────────────────────────────────
router.post(
  "/submit",
  reportSubmitLimiter,
  asyncHandler(reportController.submit)
);

// Public attachment upload — the report already came through the system
router.post(
  "/:id/attachments",
  reportSubmitLimiter,
  reportUpload.single("file"),
  asyncHandler(reportController.uploadAttachment)
);

// ── All other routes require authentication ──────────────────────────────────
router.use(authenticate);

// Review queue stats
router.get("/stats", asyncHandler(reportController.stats));

// List & detail — any authenticated user
router.get("/",       asyncHandler(reportController.list));
router.get("/:id",    asyncHandler(reportController.getOne));

// Audit-only: original PII for investigations. ADMIN or REVIEWER only.
// MUST require the X-Investigation-Context header (validated in controller).
router.get(
  "/:id/original",
  authorize("ADMIN", "REVIEWER"),
  asyncHandler(reportController.getOriginal)
);

// Update metadata — OFFICER, REVIEWER, ADMIN
router.put(
  "/:id",
  authorize("ADMIN", "OFFICER", "REVIEWER"),
  asyncHandler(reportController.update)
);

// Status transition — OFFICER, REVIEWER, ADMIN
router.post(
  "/:id/transition",
  authorize("ADMIN", "OFFICER", "REVIEWER"),
  asyncHandler(reportController.transition)
);

// Assign to a user — OFFICER, REVIEWER, ADMIN
router.post(
  "/:id/assign",
  authorize("ADMIN", "OFFICER", "REVIEWER"),
  asyncHandler(reportController.assign)
);

// Delete attachment — ADMIN, OFFICER, REVIEWER
router.delete(
  "/:id/attachments/:attachmentId",
  authorize("ADMIN", "OFFICER", "REVIEWER"),
  asyncHandler(reportController.removeAttachment)
);

// Delete — ADMIN only
router.delete(
  "/:id",
  authorize("ADMIN"),
  asyncHandler(reportController.remove)
);

export default router;
