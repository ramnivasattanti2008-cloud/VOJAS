/**
 * Whistleblower Router — Phase 65: Privacy-Preserving Whistleblower System
 * Public submission + restricted review queue
 */
import { Router } from "express";
import { whistleblowerService } from "../services/whistleblowerService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Public submission (no auth)
router.post("/", asyncHandler(async (req, res) => {
  const report = await whistleblowerService.submit({
    ...req.body,
    ipAddress: req.ip ?? req.socket.remoteAddress,
  });
  res.status(201).json({
    success: true,
    data: {
      id: report.id,
      message: "Report received. Your identity is protected.",
    },
  });
}));

// Admin review queue
router.get("/stats", authenticate, authorize("ADMIN", "REVIEWER"), asyncHandler(async (_req, res) => {
  const stats = await whistleblowerService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/", authenticate, authorize("ADMIN", "REVIEWER"), asyncHandler(async (req, res) => {
  const { status, category, page, limit } = req.query;
  const result = await whistleblowerService.list({
    status: status as string,
    category: category as string,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
  });
  res.json({ success: true, data: result });
}));

router.get("/:id", authenticate, authorize("ADMIN", "REVIEWER"), asyncHandler(async (req, res) => {
  const report = await whistleblowerService.findById(req.params.id as string);
  res.json({ success: true, data: report });
}));

router.post("/:id/review", authenticate, authorize("ADMIN", "REVIEWER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { status, resolution } = req.body;
  const report = await whistleblowerService.review(req.params.id as string, user.userId, status, resolution);
  res.json({ success: true, data: report });
}));

router.post("/:id/escalate", authenticate, authorize("ADMIN", "REVIEWER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const report = await whistleblowerService.escalate(req.params.id as string, user.userId);
  res.json({ success: true, data: report });
}));

export default router;
