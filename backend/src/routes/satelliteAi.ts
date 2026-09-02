/**
 * Satellite AI Analysis Routes — VOJAS
 * POST /api/v1/satellite/:projectId/analyze
 */

import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { getCapturesByProject } from "../services/satelliteService.js";
import { analyzeSatelliteTimeline } from "../services/satelliteAiService.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.use(authenticate);

// ── POST /api/v1/satellite/:projectId/analyze ───────────────────────────

const analyzeSchema = z.object({
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

router.post("/:projectId/analyze", async (req, res) => {
  try {
    const { projectId } = req.params;
    const parsed = analyzeSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json(errorResponse("INVALID_DATE", "Invalid date format. Use YYYY-MM-DD."));
      return;
    }

    const captures = await getCapturesByProject(projectId, {
      from: parsed.data?.from,
      to: parsed.data?.to,
    });

    if (!captures.length) {
      res.status(404).json(errorResponse("NOT_FOUND", "No satellite captures found for this project."));
      return;
    }

    const assessment = await analyzeSatelliteTimeline(projectId, captures);
    res.json(successResponse({ assessment }));
  } catch (err) {
    logger.error(`[satellite-ai] Analyze error`, err);
    res.status(500).json(errorResponse("SATELLITE_AI_ERROR", "Failed to generate satellite analysis."));
  }
});

export default router;
