import { Router } from "express";
import { lawEnforcementController } from "../controllers/lawEnforcementController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Authority metadata — any authenticated user can read
router.get("/authorities", asyncHandler(lawEnforcementController.listAuthorities));

// Dashboard stats — any authenticated user
router.get("/stats", asyncHandler(lawEnforcementController.stats));

// List all law-escalated anomalies — any authenticated user
router.get("/escalations", asyncHandler(lawEnforcementController.listEscalations));

// Escalate an anomaly to a law-enforcement authority — ADMIN or OFFICER
router.post(
  "/anomalies/:id/escalate",
  authorize("ADMIN", "OFFICER"),
  asyncHandler(lawEnforcementController.escalateAnomaly),
);

// Acknowledge a referral — ADMIN only (law authority confirms receipt)
router.post(
  "/referrals/:referenceNo/acknowledge",
  authorize("ADMIN"),
  asyncHandler(lawEnforcementController.acknowledgeReferral),
);

// Auto-escalate all CRITICAL/HIGH anomalies — ADMIN only
router.post(
  "/auto-escalate",
  authorize("ADMIN"),
  asyncHandler(lawEnforcementController.autoEscalate),
);

export default router;
