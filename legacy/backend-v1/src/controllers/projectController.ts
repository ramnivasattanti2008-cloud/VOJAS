import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { projectService } from "../services/projectService.js";
import { generateProjectPDF } from "../services/pdfService.js";
import { auditLog } from "../services/auditLogService.js";
import type { ProjectStatus, ProjectSector } from "@prisma/client";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const createProjectSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().max(2000).optional(),
  status: z.enum([
    "PROPOSED", "APPROVED", "IN_PROGRESS",
    "COMPLETED", "VERIFIED", "CANCELLED",
  ]).optional(),
  sector: z.enum([
    "PUBLIC_INFRASTRUCTURE", "WATER_SANITATION", "EDUCATION", "HEALTH",
    "AGRICULTURE", "ENVIRONMENT", "TRANSPORT", "ENERGY", "HOUSING",
    "RURAL_DEVELOPMENT", "SOCIAL_WELFARE", "PUBLIC_ADMIN",
    "FINANCE_PROCUREMENT", "JUSTICE", "LEGISLATIVE", "PUBLIC_SAFETY",
  ]),
  district: z.string().min(1, "District is required").max(100),
  constituency: z.string().max(100).optional(),
  state: z.string().min(1, "State is required").max(100),
  approvedAmount: z.number().positive("Amount must be positive").max(1_000_000_000),
  spentAmount: z.number().min(0).max(1_000_000_000).optional(),
  contractor: z.string().max(255).optional(),
  startDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: z.enum([
    "PROPOSED", "APPROVED", "IN_PROGRESS",
    "COMPLETED", "VERIFIED", "CANCELLED",
  ]).optional(),
  sector: z.enum([
    "PUBLIC_INFRASTRUCTURE", "WATER_SANITATION", "EDUCATION", "HEALTH",
    "AGRICULTURE", "ENVIRONMENT", "TRANSPORT", "ENERGY", "HOUSING",
    "RURAL_DEVELOPMENT", "SOCIAL_WELFARE", "PUBLIC_ADMIN",
    "FINANCE_PROCUREMENT", "JUSTICE", "LEGISLATIVE", "PUBLIC_SAFETY",
  ]).optional(),
  district: z.string().min(1).max(100).optional(),
  constituency: z.string().max(100).optional(),
  state: z.string().min(1).max(100).optional(),
  approvedAmount: z.number().positive().max(1_000_000_000).optional(),
  spentAmount: z.number().min(0).max(1_000_000_000).optional(),
  contractor: z.string().max(255).optional(),
  startDate: z.string().datetime().optional(),
  expectedEndDate: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
});

const listQuerySchema = z.object({
  status: z.enum([
    "PROPOSED", "APPROVED", "IN_PROGRESS",
    "COMPLETED", "VERIFIED", "CANCELLED",
  ]).optional(),
  sector: z.enum([
    "PUBLIC_INFRASTRUCTURE", "WATER_SANITATION", "EDUCATION", "HEALTH",
    "AGRICULTURE", "ENVIRONMENT", "TRANSPORT", "ENERGY", "HOUSING",
    "RURAL_DEVELOPMENT", "SOCIAL_WELFARE", "PUBLIC_ADMIN",
    "FINANCE_PROCUREMENT", "JUSTICE", "LEGISLATIVE", "PUBLIC_SAFETY",
  ]).optional(),
  district: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  search: z.string().max(255).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Controller ───────────────────────────────────────────────────────────────

export const projectController = {
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    const result = await projectService.findAll(parsed.data);
    res.json(successResponse(result));
  },

  async create(req: Request, res: Response) {
    const parsed = createProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid project data", parsed.error.issues)
      );
    }

    // Attach creator from auth token
    const userId = (req as any).user?.userId;
    const project = await projectService.create({
      ...parsed.data,
      createdById: userId ?? undefined,
    });

    res.status(201).json(successResponse({ project }));
  },

  async getOne(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const project = await projectService.findById(id);
    res.json(successResponse({ project }));
  },

  /** Rich detail with all related data (MP, vendor, reports, anomalies, expenditures, risk, locations) */
  async getDetail(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const detail = await projectService.findDetail(id);
    res.json(successResponse({ detail }));
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const parsed = updateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid project data", parsed.error.issues)
      );
    }

    // Ensure spentAmount doesn't exceed approvedAmount
    if (parsed.data.spentAmount !== undefined && parsed.data.approvedAmount !== undefined) {
      if (parsed.data.spentAmount > parsed.data.approvedAmount) {
        return res.status(400).json(
          errorResponse("VALIDATION_ERROR", "Spent amount cannot exceed approved amount")
        );
      }
    }

    const project = await projectService.update(id, parsed.data);
    res.json(successResponse({ project }));
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    await projectService.delete(id);
    res.json(successResponse({ message: "Project deleted successfully" }));
  },

  async stats(_req: Request, res: Response) {
    const stats = await projectService.getStats();
    res.json(successResponse({ stats }));
  },

  /**
   * Phase 13: Generate a PDF report for a project.
   * Returns the PDF as a binary download.
   */
  async exportPDF(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const user = (req as any).user;
    const buffer = await generateProjectPDF(id);

    await auditLog({
      userId: user?.userId ?? "unknown",
      action: "PROJECT_PDF_EXPORTED",
      resource: "Project",
      resourceId: id,
      details: { size: buffer.length, role: user?.role },
      req,
    });

    const safeName = `vojas-project-${id}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Length", buffer.length);
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}"`);
    res.send(buffer);
  },
};
