/**
 * Data Quality Router — Phase 42: Data Quality Engine
 */
import { Router } from "express";
import { dataQualityService } from "../services/dataQualityService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (_req, res) => {
  const stats = await dataQualityService.getStats();
  res.json({ success: true, data: stats });
}));

router.post("/scan", authenticate, authorize("ADMIN", "ANALYST"), asyncHandler(async (req, res) => {
  const entityType = req.body?.entityType as string | undefined;
  const result = entityType && entityType !== "PROJECT"
    ? await dataQualityService.scanEntity(entityType)
    : await dataQualityService.scanProjects();
  res.json({ success: true, data: result });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { entity, issueType, status, page, limit } = req.query;
  const result = await dataQualityService.list({
    entity: entity as string,
    issueType: issueType as string,
    status: status as string,
    page: Number(String(page)) || 1,
    limit: Number(String(limit)) || 50,
  });
  res.json({ success: true, data: result });
}));

router.post("/:id/resolve", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { resolution } = req.body;
  const issue = await dataQualityService.resolve(req.params.id as string, user.userId, resolution);
  res.json({ success: true, data: issue });
}));

router.post("/:id/dismiss", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const { resolution } = req.body;
  const issue = await dataQualityService.dismiss(req.params.id as string, user.userId, resolution);
  res.json({ success: true, data: issue });
}));

export default router;
