/**
 * Guidelines Router — Phase 41: Legislative / Guideline Audit
 */
import { Router } from "express";
import { guidelineService } from "../services/guidelineService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

router.get("/stats", authenticate, asyncHandler(async (_req, res) => {
  const stats = await guidelineService.getStats();
  res.json({ success: true, data: stats });
}));

router.get("/categories", asyncHandler(async (_req, res) => {
  const categories = await guidelineService.getCategories();
  res.json({ success: true, data: categories });
}));

router.get("/search", asyncHandler(async (req, res) => {
  const { q, category, sector } = req.query;
  const results = await guidelineService.search(String(q ?? ""), String(category ?? ""), String(sector ?? ""));
  res.json({ success: true, data: results });
}));

router.get("/project/:projectId/compliance", authenticate, asyncHandler(async (req, res) => {
  const compliance = await guidelineService.getProjectCompliance(String(req.params.projectId));
  res.json({ success: true, data: compliance });
}));

router.get("/", authenticate, asyncHandler(async (req, res) => {
  const { category, sector, page, limit } = req.query;
  const result = await guidelineService.list({
    category: category as string,
    sector: sector as string,
    page: Number(page) || 1,
    limit: Number(limit) || 50,
  });
  res.json({ success: true, data: result });
}));

router.get("/:id", authenticate, asyncHandler(async (req, res) => {
  const guideline = await guidelineService.findById(req.params.id as string);
  res.json({ success: true, data: guideline });
}));

router.post("/", authenticate, authorize("ADMIN"), asyncHandler(async (req, res) => {
  const guideline = await guidelineService.create(req.body);
  res.status(201).json({ success: true, data: guideline });
}));

router.post("/:id/check-compliance", authenticate, authorize("ADMIN", "OFFICER", "REVIEWER"), asyncHandler(async (req, res) => {
  const { projectId, isCompliant, nonComplianceNote, checkedById } = req.body;
  const check = await guidelineService.recordComplianceCheck(projectId, req.params.id as string, {
    isCompliant,
    nonComplianceNote,
    checkedById,
  });
  res.status(201).json({ success: true, data: check });
}));

export default router;
