/**
 * Assets Router — Phase 16: Public Asset Health
 */
import { Router } from "express";
import { assetService } from "../services/assetService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { z } from "zod";

const router = Router();

const createAssetSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  district: z.string().min(1),
  state: z.string().min(1),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  address: z.string().optional(),
  landmark: z.string().optional(),
  description: z.string().optional(),
});

router.get("/stats", asyncHandler(async (_req, res) => {
  const stats = await assetService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/", asyncHandler(async (req, res) => {
  const { type, district, state, status, page, limit, search } = req.query;
  const result = await assetService.list({
    type: type as string,
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
  const asset = await assetService.findById(req.params.id as string);
  res.json({ success: true, data: asset });
}));

router.get("/:id/health", asyncHandler(async (req, res) => {
  const health = await assetService.getHealth(req.params.id as string);
  res.json({ success: true, data: health });
}));

router.post("/", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const data = createAssetSchema.parse(req.body);
  const asset = await assetService.create(data);
  res.status(201).json({ success: true, data: asset });
}));

router.put("/:id", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const asset = await assetService.update(req.params.id as string, req.body);
  res.json({ success: true, data: asset });
}));

router.delete("/:id", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  await assetService.delete(req.params.id as string);
  res.json({ success: true, data: null });
}));

// Inspections
router.post("/:id/inspections", authenticate, authorize("ADMIN", "OFFICER", "FIELD_OFFICER"), asyncHandler(async (req, res) => {
  const inspection = await assetService.createInspection(req.params.id as string, req.body);
  res.status(201).json({ success: true, data: inspection });
}));

// Problems
router.post("/:id/problems", authenticate, asyncHandler(async (req, res) => {
  const problem = await assetService.createProblem(req.params.id as string, req.body);
  res.status(201).json({ success: true, data: problem });
}));

router.post("/problems/:problemId/resolve", authenticate, asyncHandler(async (req, res) => {
  const problem = await assetService.resolveProblem(req.params.problemId as string);
  res.json({ success: true, data: problem });
}));

export default router;
