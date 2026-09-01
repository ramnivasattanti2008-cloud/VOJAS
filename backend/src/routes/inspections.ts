/**
 * Inspections Router — Phase 23: Field Verification
 */
import { Router } from "express";
import { inspectionService } from "../services/inspectionService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { z } from "zod";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (_req, res) => {
  const stats = await inspectionService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/my", authenticate, asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const inspections = await inspectionService.getMyInspections(user.userId);
  res.json({ success: true, data: inspections });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { assigneeId, projectId, result, status, page, limit } = req.query;
  const result_ = await inspectionService.list({
    assigneeId: assigneeId as string,
    projectId: projectId as string,
    result: result as string,
    status: status as string,
    page: Number(String(page)) || 1,
    limit: Number(String(limit)) || 50,
  });
  res.json({ success: true, data: result_ });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const inspection = await inspectionService.findById(req.params.id as string);
  res.json({ success: true, data: inspection });
}));

router.post("/", authenticate, authorize("ADMIN", "OFFICER", "FIELD_OFFICER"), asyncHandler(async (req, res) => {
  // Whitelist only valid fields to match the FieldInspection Prisma model
  const { projectId, assetId, assigneeId, locationDesc, latitude, longitude, scheduledDate, notes } = req.body;
  const inspection = await inspectionService.create({
    projectId,
    assetId,
    assigneeId,
    locationDesc,
    latitude,
    longitude,
    scheduledDate: scheduledDate ? new Date(scheduledDate) : undefined,
    notes,
  });
  res.status(201).json({ success: true, data: inspection });
}));

router.put("/:id/assign", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const { assigneeId } = req.body;
  const inspection = await inspectionService.assign(req.params.id as string, assigneeId);
  res.json({ success: true, data: inspection });
}));

router.post("/:id/complete", authenticate, authorize("ADMIN", "OFFICER", "FIELD_OFFICER"), asyncHandler(async (req, res) => {
  const inspection = await inspectionService.complete(req.params.id as string, req.body);
  res.json({ success: true, data: inspection });
}));

export default router;
