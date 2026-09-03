import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { riskService } from "../services/riskService.js";
import type { RiskLevel } from "@prisma/client";

// ─── Query schema ─────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  riskLevel: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  sortBy:    z.enum(["overallScore", "riskLevel", "updatedAt"]).default("overallScore"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const riskController = {
  // GET /risk/stats
  async stats(_req: Request, res: Response) {
    const stats = await riskService.getRiskStats();
    res.json(successResponse(stats));
  },

  // GET /risk  (list all with filters)
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    const result = await riskService.listRisks({
      riskLevel:  parsed.data.riskLevel as RiskLevel | undefined,
      sortBy:     parsed.data.sortBy as "overallScore" | "riskLevel" | "updatedAt",
      sortOrder:  parsed.data.sortOrder as "asc" | "desc",
      page:       parsed.data.page,
      limit:      parsed.data.limit,
    });

    res.json(successResponse(result));
  },

  // GET /risk/:projectId
  async getOne(req: Request, res: Response) {
    const projectId = String(req.params.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const risk = await riskService.getRiskByProject(projectId);
    res.json(successResponse({ risk }));
  },

  // POST /risk/recalculate
  async recalculateAll(_req: Request, res: Response) {
    const results = await riskService.recalculateAll();
    res.json(successResponse({
      message: `Recalculated risk for ${results.length} projects`,
      count: results.length,
      projects: results,
    }));
  },

  // POST /risk/:projectId/recalculate
  async recalculateOne(req: Request, res: Response) {
    const projectId = String(req.params.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const risk = await riskService.calculateForProject(projectId);
    res.json(successResponse({ risk }));
  },
};
