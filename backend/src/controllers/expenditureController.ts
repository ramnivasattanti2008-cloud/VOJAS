import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { expenditureService } from "../services/expenditureService.js";
import type { ExpenditureCategory, PaymentStatus } from "@prisma/client";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const EXPENDITURE_CATEGORIES = [
  "MATERIAL", "LABOR", "EQUIPMENT", "CONSULTANCY", "ADMINISTRATIVE", "CONTINGENCY", "OTHER",
] as const;

const PAYMENT_STATUSES = [
  "PENDING", "AUTHORIZED", "PAID", "REJECTED", "REVERSED",
] as const;

const createExpenditureSchema = z.object({
  projectId:  z.string().uuid().optional(),  // Optional when in URL path
  amount:      z.number().positive("Amount must be positive").max(100_000_000),
  category:    z.enum(EXPENDITURE_CATEGORIES),
  description: z.string().min(1, "Description is required").max(500),
  vendor:     z.string().max(255).optional(),
  invoiceNo:  z.string().max(100).optional(),
  paidOn:     z.string().datetime().optional(),
  notes:      z.string().max(500).optional(),
});

const updateExpenditureSchema = z.object({
  amount:      z.number().positive().max(100_000_000).optional(),
  category:    z.enum(EXPENDITURE_CATEGORIES).optional(),
  description: z.string().min(1).max(500).optional(),
  vendor:     z.string().max(255).optional(),
  invoiceNo:  z.string().max(100).optional(),
  paidOn:     z.string().datetime().optional(),
  status:     z.enum(PAYMENT_STATUSES).optional(),
  notes:      z.string().max(500).optional(),
});

const listQuerySchema = z.object({
  projectId: z.string().optional(),
  category:  z.enum(EXPENDITURE_CATEGORIES).optional(),
  status:    z.enum(PAYMENT_STATUSES).optional(),
  page:      z.coerce.number().int().min(1).default(1),
  limit:     z.coerce.number().int().min(1).max(200).default(50),
});

const transitionSchema = z.object({
  status: z.enum(PAYMENT_STATUSES),
});

// ── Controller ───────────────────────────────────────────────────────────────

export const expenditureController = {
  // GET /financials/stats
  async schemeFinancials(_req: Request, res: Response) {
    const financials = await expenditureService.getSchemeFinancials();
    res.json(successResponse(financials));
  },

  // GET /financials (list all, with filters) OR /projects/:projectId/expenditures (nested)
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    // projectId comes from query param (top-level) or URL params (nested route)
    const projectId = parsed.data.projectId || String(req.params.projectId || "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "projectId is required")
      );
    }

    const result = await expenditureService.findByProject(projectId, parsed.data);
    res.json(successResponse(result));
  },

  // GET /financials/project/:projectId
  async getByProject(req: Request, res: Response) {
    const projectId = String(req.params.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const parsed = listQuerySchema.omit({ projectId: true }).safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    const result = await expenditureService.findByProject(projectId, parsed.data);
    res.json(successResponse(result));
  },

  // GET /financials/:id
  async getOne(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Expenditure ID is required")
      );
    }

    const expenditure = await expenditureService.findById(id);
    res.json(successResponse({ expenditure }));
  },

  // POST /financials OR POST /projects/:projectId/expenditures
  async create(req: Request, res: Response) {
    const parsed = createExpenditureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid expenditure data", parsed.error.issues)
      );
    }

    // Project ID comes from URL params (nested route) or body (top-level)
    const projectId = String(req.params.projectId ?? "") || parsed.data.projectId;
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "projectId is required (in body or URL)")
      );
    }

    const userId = (req as any).user?.userId;
    const expenditure = await expenditureService.create({
      projectId,
      amount:     parsed.data.amount,
      category:   parsed.data.category,
      description: parsed.data.description,
      vendor:     parsed.data.vendor,
      invoiceNo:  parsed.data.invoiceNo,
      paidOn:     parsed.data.paidOn,
      notes:      parsed.data.notes,
      createdById: userId ?? undefined,
    });

    res.status(201).json(successResponse({ expenditure }));
  },

  // PUT /financials/:id
  async update(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Expenditure ID is required")
      );
    }

    const parsed = updateExpenditureSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid expenditure data", parsed.error.issues)
      );
    }

    const expenditure = await expenditureService.update(id, parsed.data);
    res.json(successResponse({ expenditure }));
  },

  // POST /financials/:id/transition
  async transition(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Expenditure ID is required")
      );
    }

    const parsed = transitionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid status", parsed.error.issues)
      );
    }

    try {
      const expenditure = await expenditureService.transition(id, parsed.data.status);
      res.json(successResponse({ expenditure }));
    } catch (err: any) {
      if (err.code === "INVALID_TRANSITION") {
        return res.status(400).json(
          errorResponse("INVALID_TRANSITION", err.message)
        );
      }
      throw err;
    }
  },

  // GET /financials/project/:projectId/financials
  async projectFinancials(req: Request, res: Response) {
    const projectId = String(req.params.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const financials = await expenditureService.getProjectFinancials(projectId);
    res.json(successResponse(financials));
  },

  // DELETE /financials/:id
  async remove(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Expenditure ID is required")
      );
    }

    await expenditureService.delete(id);
    res.json(successResponse({ message: "Expenditure deleted successfully" }));
  },
};
