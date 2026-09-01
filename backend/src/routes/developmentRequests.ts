/**
 * Development Requests Router — Phase 17
 */
import { Router } from "express";
import { developmentRequestService } from "../services/developmentRequestService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { z } from "zod";

const router = Router();

router.get("/stats", asyncHandler(async (_req, res) => {
  const stats = await developmentRequestService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/groups", asyncHandler(async (req, res) => {
  const groups = await developmentRequestService.getGroups(req.query.sector as string);
  res.json({ success: true, data: groups });
}));

router.get("/priority/:district", asyncHandler(async (req, res) => {
  const priorities = await developmentRequestService.getPriorityByArea(String(req.params.district));
  res.json({ success: true, data: priorities });
}));

router.get("/", asyncHandler(async (req, res) => {
  const { sector, district, state, status, page, limit, search } = req.query;
  const result = await developmentRequestService.list({
    sector: sector as string,
    district: district as string,
    state: state as string,
    status: status as string,
    page: Number(String(page)) || 1,
    limit: Number(String(limit)) || 50,
    search: search as string,
  });
  res.json({ success: true, data: result });
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const request = await developmentRequestService.findById(req.params.id as string);
  res.json({ success: true, data: request });
}));

router.post("/", asyncHandler(async (req, res) => {
  const request = await developmentRequestService.create(req.body);
  res.status(201).json({ success: true, data: request });
}));

router.put("/:id/status", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER"), asyncHandler(async (req, res) => {
  const { status, resolution } = req.body;
  const request = await developmentRequestService.updateStatus(req.params.id as string, status, resolution);
  res.json({ success: true, data: request });
}));

router.post("/:id/support", asyncHandler(async (req, res) => {
  const support = await developmentRequestService.support(req.params.id as string, req.body);
  res.status(201).json({ success: true, data: support });
}));

export default router;
