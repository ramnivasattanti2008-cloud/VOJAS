/**
 * Satellite Imagery Routes — VOJAS
 * GET /api/v1/satellite/:projectId/captures
 * GET /api/v1/satellite/:projectId/captures/latest
 * GET /api/v1/satellite/:projectId/timeline
 * GET /api/v1/satellite/captures/:captureId
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import {
  getCapturesByProject,
  getCaptureById,
  getLatestCapture,
  getTimeline,
} from "../services/satelliteService.js";
import { logger } from "../utils/logger.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Query param validation ──────────────────────────────────────────────────

const dateQuerySchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
}).optional();

// ── GET /api/v1/satellite/:projectId/captures ───────────────────────────

router.get("/:projectId/captures", async (req, res) => {
  try {
    const { projectId } = req.params;
    const parsed = dateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid date format. Use YYYY-MM-DD." });
      return;
    }
    const captures = await getCapturesByProject(projectId, {
      from: parsed.data?.from,
      to: parsed.data?.to,
    });
    res.json({ captures, total: captures.length });
  } catch (err) {
    logger.error(`[satellite] GET captures error`, err);
    res.status(500).json({ error: "Failed to fetch satellite captures." });
  }
});

// ── GET /api/v1/satellite/:projectId/captures/latest ────────────────────

router.get("/:projectId/captures/latest", async (req, res) => {
  try {
    const { projectId } = req.params;
    const capture = await getLatestCapture(projectId);
    if (!capture) {
      res.status(404).json({ error: "No captures found for this project." });
      return;
    }
    res.json({ capture });
  } catch (err) {
    logger.error(`[satellite] GET latest capture error`, err);
    res.status(500).json({ error: "Failed to fetch latest capture." });
  }
});

// ── GET /api/v1/satellite/:projectId/timeline ────────────────────────────

router.get("/:projectId/timeline", async (req, res) => {
  try {
    const { projectId } = req.params;
    const timeline = await getTimeline(projectId);
    res.json({ timeline, total: timeline.length });
  } catch (err) {
    logger.error(`[satellite] GET timeline error`, err);
    res.status(500).json({ error: "Failed to fetch timeline." });
  }
});

// ── GET /api/v1/satellite/captures/:captureId ────────────────────────────

router.get("/captures/:captureId", async (req, res) => {
  try {
    const { captureId } = req.params;
    const capture = await getCaptureById(captureId);
    if (!capture) {
      res.status(404).json({ error: "Capture not found." });
      return;
    }
    res.json({ capture });
  } catch (err) {
    logger.error(`[satellite] GET capture error`, err);
    res.status(500).json({ error: "Failed to fetch capture." });
  }
});

export default router;
