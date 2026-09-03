import { Request, Response } from "express";
import { z } from "zod";
import { prisma } from "../config/database.js";
import { successResponse, errorResponse } from "../utils/response.js";
import {
  lawEnforcementService,
  type LawAuthority,
} from "../services/lawEnforcementService.js";
import { notifyReferralAcknowledged } from "../services/notificationService.js";

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const escalateSchema = z.object({
  authority: z.enum([
    "ACB_OFFICE",
    "POLICE_OFFICE",
    "CVC",
    "LOKAYUKTA",
    "VIGILANCE",
    "COMPTROLLER",
  ]),
  notes: z.string().max(2000).optional(),
  notifyAllAdmins: z.boolean().optional(),
});

const acknowledgeReferralSchema = z.object({
  notes: z.string().max(2000).optional(),
});

const autoEscalateSchema = z.object({
  minRiskScore: z.number().int().min(0).max(100).optional(),
  limit: z.number().int().min(1).max(500).optional(),
});

const listQuerySchema = z.object({
  authority: z
    .enum(["ACB_OFFICE", "POLICE_OFFICE", "CVC", "LOKAYUKTA", "VIGILANCE", "COMPTROLLER"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(20),
});

// ─── Controller ───────────────────────────────────────────────────────────────

export const lawEnforcementController = {
  /** GET /api/v1/law-enforcement/authorities — list available authorities */
  async listAuthorities(_req: Request, res: Response) {
    res.json(
      successResponse({
        authorities: lawEnforcementService.authorities(),
      }),
    );
  },

  /** POST /api/v1/law-enforcement/anomalies/:id/escalate */
  async escalateAnomaly(req: Request, res: Response) {
    const anomalyId = String(req.params.id ?? "");
    if (!anomalyId) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Anomaly ID is required"));
    }

    const parsed = escalateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.issues),
        );
    }

    const userId = (req as any).user?.userId ?? "";
    if (!userId) {
      return res
        .status(401)
        .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
    }

    try {
      const result = await lawEnforcementService.escalate({
        anomalyId,
        authority: parsed.data.authority as LawAuthority,
        notes: parsed.data.notes,
        userId,
        notifyAllAdmins: parsed.data.notifyAllAdmins ?? true,
      });
      res.json(successResponse(result));
    } catch (err: any) {
      const msg = err?.message ?? "Escalation failed";
      const code = msg.includes("not found") ? "NOT_FOUND" : "ESCALATION_FAILED";
      res
        .status(code === "NOT_FOUND" ? 404 : 500)
        .json(errorResponse(code, msg));
    }
  },

  /** POST /api/v1/law-enforcement/referrals/:referenceNo/acknowledge */
  async acknowledgeReferral(req: Request, res: Response) {
    const referenceNo = String(req.params.referenceNo ?? "");
    if (!referenceNo) {
      return res
        .status(400)
        .json(errorResponse("VALIDATION_ERROR", "Reference number is required"));
    }

    const parsed = acknowledgeReferralSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.issues),
        );
    }

    try {
      const result = await lawEnforcementService.acknowledge(
        referenceNo,
        parsed.data.notes,
      );

      // Look up the anomaly to find the authority for the notification
      const anomaly = await prisma.anomaly.findFirst({
        where: { lawReferenceNo: referenceNo },
        select: { id: true, lawAuthority: true },
      });

      if (anomaly?.lawAuthority) {
        await notifyReferralAcknowledged(
          referenceNo,
          anomaly.id,
          lawEnforcementService.authorityLabel(
            anomaly.lawAuthority as LawAuthority,
          ),
        ).catch(() => undefined);
      }

      res.json(successResponse(result));
    } catch (err: any) {
      const msg = err?.message ?? "Acknowledge failed";
      const code = msg.includes("No anomaly") ? "NOT_FOUND" : "ACK_FAILED";
      res
        .status(code === "NOT_FOUND" ? 404 : 500)
        .json(errorResponse(code, msg));
    }
  },

  /** GET /api/v1/law-enforcement/escalations — list all law-escalated anomalies */
  async listEscalations(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          errorResponse(
            "VALIDATION_ERROR",
            "Invalid query parameters",
            parsed.error.issues,
          ),
        );
    }

    const page = parsed.data.page;
    const limit = parsed.data.limit;
    const skip = (page - 1) * limit;

    const where: any = { lawEscalation: true };
    if (parsed.data.authority) where.lawAuthority = parsed.data.authority;

    const [items, total] = await Promise.all([
      prisma.anomaly.findMany({
        where,
        orderBy: { lawEscalatedAt: "desc" },
        skip,
        take: limit,
        include: {
          project: {
            select: {
              id: true,
              name: true,
              state: true,
              district: true,
              constituency: true,
              mpName: true,
              approvedAmount: true,
              spentAmount: true,
            },
          },
          lawEscalatedBy: {
            select: { id: true, name: true, email: true, role: true },
          },
        },
      }),
      prisma.anomaly.count({ where }),
    ]);

    res.json(
      successResponse({
        items: items.map((a) => ({
          id: a.id,
          title: a.title,
          description: a.description,
          severity: a.severity,
          riskScore: a.riskScore,
          category: a.category,
          status: a.status,
          lawAuthority: a.lawAuthority,
          lawAuthorityLabel: a.lawAuthority
            ? lawEnforcementService.authorityLabel(a.lawAuthority as LawAuthority)
            : null,
          lawReferenceNo: a.lawReferenceNo,
          lawEscalatedAt: a.lawEscalatedAt,
          lawAcknowledged: a.lawAcknowledged,
          lawNotes: a.lawNotes,
          escalatedBy: a.lawEscalatedBy,
          project: a.project,
        })),
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      }),
    );
  },

  /** POST /api/v1/law-enforcement/auto-escalate — ADMIN only */
  async autoEscalate(req: Request, res: Response) {
    const parsed = autoEscalateSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      return res
        .status(400)
        .json(
          errorResponse("VALIDATION_ERROR", "Invalid data", parsed.error.issues),
        );
    }

    const userId = (req as any).user?.userId ?? "";
    if (!userId) {
      return res
        .status(401)
        .json(errorResponse("UNAUTHORIZED", "User not authenticated"));
    }

    const minRiskScore = parsed.data.minRiskScore ?? 85;
    const count = await lawEnforcementService.autoEscalateCritical(
      minRiskScore,
      userId,
    );
    res.json(
      successResponse({
        autoEscalated: count,
        minRiskScore,
      }),
    );
  },

  /** GET /api/v1/law-enforcement/stats — count by authority */
  async stats(_req: Request, res: Response) {
    const byAuthority = await prisma.anomaly.groupBy({
      by: ["lawAuthority"],
      where: { lawEscalation: true },
      _count: true,
    });

    const acknowledged = await prisma.anomaly.count({
      where: { lawEscalation: true, lawAcknowledged: true },
    });

    const total = await prisma.anomaly.count({ where: { lawEscalation: true } });

    const recent = await prisma.anomaly.findMany({
      where: { lawEscalation: true },
      orderBy: { lawEscalatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        title: true,
        lawReferenceNo: true,
        lawAuthority: true,
        lawEscalatedAt: true,
        severity: true,
      },
    });

    res.json(
      successResponse({
        total,
        acknowledged,
        pending: total - acknowledged,
        byAuthority: byAuthority
          .filter((row) => row.lawAuthority != null)
          .map((row) => ({
            authority: row.lawAuthority,
            label: lawEnforcementService.authorityLabel(
              row.lawAuthority as LawAuthority,
            ),
            count: row._count,
          })),
        recent,
      }),
    );
  },
};
