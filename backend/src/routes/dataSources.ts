/**
 * Data Sources Router — Phase 43: Data Source Management
 */
import { Router } from "express";
import { dataSourceService } from "../services/dataSourceService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (_req, res) => {
  const stats = await dataSourceService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/freshness", authenticate, asyncHandler(async (req, res) => {
  const { sourceName, datasetName } = req.query;
  const freshness = await dataSourceService.checkFreshness(sourceName as string, datasetName as string);
  res.json({ success: true, data: freshness });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { status, department, page, limit } = req.query;
  const result = await dataSourceService.list({
    status: status as string,
    department: department as string,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
  });
  res.json({ success: true, data: result });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const ds = await dataSourceService.findById(req.params.id as string);
  res.json({ success: true, data: ds });
}));

router.post("/", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const ds = await dataSourceService.create(req.body);
  res.status(201).json({ success: true, data: ds });
}));

router.put("/:id", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const ds = await dataSourceService.update(req.params.id as string, req.body);
  res.json({ success: true, data: ds });
}));

router.post("/:id/refresh", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const ds = await dataSourceService.refreshStatus(req.params.id as string);
  res.json({ success: true, data: ds });
}));

export default router;
