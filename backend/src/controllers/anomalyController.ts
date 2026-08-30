import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  runAnomalyScan,
  findAnomalies,
  findById,
  acknowledge,
  resolveAnomaly,
  updateRule,
  getAnomalyStats,
  type AnomalyStatus,
  type AnomalySeverity,
  type AnomalyCategory,
} from "../services/anomalyService.js";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const listQuerySchema = z.object({
  status: z.enum(["OPEN","ACKNOWLEDGED","UNDER_INVESTIGATION","RESOLVED","ESCALATED","DISMISSED"]).optional(),
  severity: z.enum(["LOW","MEDIUM","HIGH","CRITICAL"]).optional(),
  category: z.enum(["DUPLICATE","COST_OUTLIER","TIMELINE","BUDGET_OVERRUN","STALLED","GEOGRAPHIC","COMPLIANCE","FINANCIAL"]).optional(),
  projectId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

const acknowledgeSchema = z.object({});
const resolveSchema = z.object({
  resolution: z.string().min(1, "Resolution note is required").max(2000),
});

const updateRuleSchema = z.object({
  enabled: z.boolean(),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const anomalyController = {
  /** List anomalies with filters */
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    const result = await findAnomalies({
      status: parsed.data.status as AnomalyStatus,
      severity: parsed.data.severity as AnomalySeverity,
      category: parsed.data.category as AnomalyCategory,
      projectId: parsed.data.projectId,
      page: parsed.data.page,
      limit: parsed.data.limit,
    });

    res.json(successResponse(result));
  },

  /** Dashboard stats */
  async stats(_req: Request, res: Response) {
    const data = await getAnomalyStats();
    res.json(successResponse(data));
  },

  /** Get one anomaly */
  async getOne(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Anomaly ID is required"));
    }

    const anomaly = await findById(id);
    res.json(successResponse({ anomaly }));
  },

  /** Acknowledge — analyst marks as reviewed */
  async acknowledge(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    const userId = (req as any).user?.userId ?? "";
    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Anomaly ID is required"));
    }

    const parsed = acknowledgeSchema.safeParse({});
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.issues)
      );
    }

    const anomaly = await acknowledge(id, userId);
    res.json(successResponse({ anomaly }));
  },

  /** Resolve — analyst marks as resolved with notes */
  async resolve(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    const userId = (req as any).user?.userId ?? "";

    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Anomaly ID is required"));
    }

    const parsed = resolveSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Resolution note is required", parsed.error.issues)
      );
    }

    const anomaly = await resolveAnomaly(id, userId, parsed.data.resolution);
    res.json(successResponse({ anomaly }));
  },

  /** Manually trigger full anomaly scan */
  async scan(_req: Request, res: Response) {
    const result = await runAnomalyScan();
    res.json(successResponse(result));
  },

  /** List all anomaly rules */
  async listRules(_req: Request, res: Response) {
    const { prisma } = await import("../config/database.js");
    const rules = await prisma.anomalyRule.findMany({
      orderBy: { priority: "desc" },
    });
    res.json(successResponse({ rules }));
  },

  /** Update rule (enable/disable) */
  async updateRule(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(errorResponse("VALIDATION_ERROR", "Rule ID is required"));
    }

    const parsed = updateRuleSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "enabled (boolean) is required", parsed.error.issues)
      );
    }

    const rule = await updateRule(id, parsed.data.enabled);
    res.json(successResponse({ rule }));
  },
};
