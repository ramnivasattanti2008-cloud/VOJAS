import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { analyticsService } from "../services/analyticsService.js";

const VALID_ROLES = ["ADMIN", "OFFICER", "ANALYST", "REVIEWER", "VIEWER"] as const;
type Role = (typeof VALID_ROLES)[number];

const dashboardQuerySchema = z.object({
  role: z.enum(VALID_ROLES).optional().default("ADMIN"),
});

// ─── Controller ────────────────────────────────────────────────────────────────

export const analyticsController = {
  /**
   * GET /analytics/summary
   * Full analytics payload — powers the Analytics page with all chart data.
   */
  async summary(_req: Request, res: Response) {
    const data = await analyticsService.getSummary();
    res.json(successResponse(data));
  },

  /**
   * GET /analytics/dashboard
   * Role-specific lightweight stats for the homepage dashboard.
   * Role is derived from the authenticated user if present.
   */
  async dashboard(req: Request, res: Response) {
    const userRole = (req as any).user?.role as Role | undefined;
    const data = await analyticsService.getDashboardStats(userRole ?? "ADMIN");
    res.json(successResponse(data));
  },
};
