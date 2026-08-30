import { Request, Response } from "express";
import { z } from "zod";
import { successResponse, errorResponse } from "../utils/response.js";
import { locationService } from "../services/locationService.js";

// ── Zod Schemas ──────────────────────────────────────────────────────────────

const createLocationSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  label: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  landmark: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

const updateLocationSchema = z.object({
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  label: z.string().max(255).optional(),
  address: z.string().max(500).optional(),
  landmark: z.string().max(255).optional(),
  isPrimary: z.boolean().optional(),
});

const listQuerySchema = z.object({
  projectId: z.string().optional(),
  verified: z.coerce.boolean().optional(),
  primary: z.coerce.boolean().optional(),
  state: z.string().max(100).optional(),
  status: z.enum([
    "PROPOSED", "APPROVED", "IN_PROGRESS",
    "COMPLETED", "VERIFIED", "CANCELLED",
  ]).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(500).default(50),
});

// ── Controller ───────────────────────────────────────────────────────────────

export const locationController = {
  async list(req: Request, res: Response) {
    const parsed = listQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid query parameters", parsed.error.issues)
      );
    }

    const { state, status, ...rest } = parsed.data;
    const result = await locationService.findAll(rest);
    res.json(successResponse(result));
  },

  /**
   * Map overview endpoint — returns lightweight marker data
   * for the full India/state map view.
   */
  async mapOverview(req: Request, res: Response) {
    const state = typeof req.query.state === "string" ? req.query.state : undefined;
    const status = typeof req.query.status === "string" ? req.query.status : undefined;

    const data = await locationService.getMapData({ state, status });
    res.json(successResponse(data));
  },

  async create(req: Request, res: Response) {
    const parsed = createLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid location data", parsed.error.issues)
      );
    }

    const location = await locationService.create(parsed.data);
    res.status(201).json(successResponse({ location }));
  },

  async getOne(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Location ID is required")
      );
    }

    const location = await locationService.findById(id);
    res.json(successResponse({ location }));
  },

  /**
   * All locations for a specific project. Used by the project detail page.
   */
  async getByProject(req: Request, res: Response) {
    const projectId = String(req.params.projectId ?? "");
    if (!projectId) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Project ID is required")
      );
    }

    const locations = await locationService.findByProject(projectId);
    res.json(successResponse({ locations, total: locations.length }));
  },

  async update(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Location ID is required")
      );
    }

    const parsed = updateLocationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Invalid location data", parsed.error.issues)
      );
    }

    const location = await locationService.update(id, parsed.data);
    res.json(successResponse({ location }));
  },

  async remove(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Location ID is required")
      );
    }

    await locationService.delete(id);
    res.json(successResponse({ message: "Location deleted successfully" }));
  },

  /**
   * Mark a location as verified (REVIEWER / ADMIN only — enforced in route).
   */
  async verify(req: Request, res: Response) {
    const id = String(req.params.id ?? "");
    if (!id) {
      return res.status(400).json(
        errorResponse("VALIDATION_ERROR", "Location ID is required")
      );
    }

    const userId = (req as any).user?.userId;
    if (!userId) {
      return res.status(401).json(
        errorResponse("UNAUTHORIZED", "Authentication required to verify location")
      );
    }

    const location = await locationService.verify(id, userId);
    res.json(successResponse({ location }));
  },
};
