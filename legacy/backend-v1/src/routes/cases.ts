/**
 * Cases Router — Phase 24: Case Management
 */
import { Router } from "express";
import { caseService } from "../services/caseService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (_req, res) => {
  const stats = await caseService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { status, type, priority, assignedToId, page, limit, search } = req.query;
  const result = await caseService.list({
    status: status as string,
    type: type as string,
    priority: priority as string,
    assignedToId: assignedToId as string,
    page: Number(String(page)) || 1,
    limit: Number(String(limit)) || 50,
    search: search as string,
  });
  res.json({ success: true, data: result });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const case_ = await caseService.findById(req.params.id as string);
  res.json({ success: true, data: case_ });
}));

router.get("/:id/timeline", authenticate, asyncHandler(async (req, res) => {
  const timeline = await caseService.getTimeline(req.params.id as string);
  res.json({ success: true, data: timeline });
}));

router.post("/", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER", "ANALYST"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const case_ = await caseService.create({ ...req.body, assignedToId: req.body.assignedToId ?? user.userId });
  res.status(201).json({ success: true, data: case_ });
}));

router.post("/:id/assign", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const { assignedToId } = req.body;
  const case_ = await caseService.assign(req.params.id as string, assignedToId);
  res.json({ success: true, data: case_ });
}));

router.post("/:id/transition", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { status, notes } = req.body;
  const case_ = await caseService.transition(req.params.id as string, status, notes, user.userId);
  res.json({ success: true, data: case_ });
}));

router.post("/:id/evidence", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER", "ANALYST"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const evidence = await caseService.addEvidence(req.params.id as string, { ...req.body, addedById: user.userId });
  res.status(201).json({ success: true, data: evidence });
}));

router.post("/:id/escalate", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { notes } = req.body;
  const case_ = await caseService.transition(req.params.id as string, "ESCALATED", notes, user.userId);
  res.json({ success: true, data: case_ });
}));

router.post("/:id/close", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { resolution } = req.body;
  const case_ = await caseService.transition(req.params.id as string, "CLOSED", resolution, user.userId);
  res.json({ success: true, data: case_ });
}));

router.post("/:id/reopen", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const case_ = await caseService.transition(req.params.id as string, "REOPENED", "Reopened for further investigation", user.userId);
  res.json({ success: true, data: case_ });
}));

export default router;
