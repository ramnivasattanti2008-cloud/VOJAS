/**
 * Priority Router — Phase 18: Development Priority
 */
import { Router } from "express";
import { priorityService } from "../services/priorityService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (req, res) => {
  const stats = await priorityService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/top", authenticate, asyncHandler(async (req, res) => {
  const { limit } = req.query;
  const areas = await priorityService.getTopPriorityAreas(Number(limit) || 20);
  res.json({ success: true, data: areas });
}));

router.get("/district/:district", authenticate, asyncHandler(async (req, res) => {
  const priorities = await priorityService.getByDistrict(String(req.params.district));
  res.json({ success: true, data: priorities });
}));

router.get("/area", authenticate, asyncHandler(async (req, res) => {
  const { state, district } = req.query;
  const priorities = await priorityService.getByArea(state as string, district as string);
  res.json({ success: true, data: priorities });
}));

router.post("/compute", authenticate, authorize("ADMIN", "OFFICER", "ANALYST"), asyncHandler(async (req, res) => {
  const priority = await priorityService.computePriority(req.body);
  res.json({ success: true, data: priority });
}));

router.post("/recompute-all", authenticate, authorize("ADMIN", "ANALYST"), asyncHandler(async (req, res) => {
  const results = await priorityService.recomputeAll();
  res.json({ success: true, data: { recomputed: results.length } });
}));

export default router;
