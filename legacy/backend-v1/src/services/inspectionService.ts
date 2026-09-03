/**
 * Inspection Service — Phase 23: Field Verification
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

export interface CreateInspectionInput {
  projectId?: string;
  assetId?: string;
  assigneeId?: string;
  locationDesc?: string;
  latitude?: number;
  longitude?: number;
  scheduledDate?: Date;
  notes?: string;
}

export interface CompleteInspectionInput {
  completedDate?: Date;
  result?: string;
  checklist?: string;
  photos?: string;
  notes?: string;
  evidenceUrls?: string;
}

export const inspectionService = {
  async create(data: CreateInspectionInput) {
    if (!data.projectId && !data.assetId) {
      throw new AppError(400, "VALIDATION_ERROR", "Either projectId or assetId is required");
    }
    // Validate projectId / assetId exists to avoid FK constraint errors
    if (data.projectId) {
      const proj = await prisma.project.findUnique({ where: { id: data.projectId }, select: { id: true } });
      if (!proj) throw new AppError(400, "VALIDATION_ERROR", `Project '${data.projectId}' not found`);
    }
    if (data.assetId) {
      const asset = await prisma.asset.findUnique({ where: { id: data.assetId }, select: { id: true } });
      if (!asset) throw new AppError(400, "VALIDATION_ERROR", `Asset '${data.assetId}' not found`);
    }
    return prisma.fieldInspection.create({ data });
  },

  async findById(id: string) {
    const inspection = await prisma.fieldInspection.findUnique({
      where: { id },
      include: { asset: true, project: true },
    });
    if (!inspection) throw new AppError(404, "NOT_FOUND", `Inspection '${id}' not found`);
    return inspection;
  },

  async list(opts: {
    assigneeId?: string;
    projectId?: string;
    result?: string;
    status?: string; // COMPLETED vs PENDING
    page?: number;
    limit?: number;
  }) {
    const { assigneeId, projectId, result, status, page = 1, limit = 50 } = opts;
    const where: Record<string, unknown> = {};
    if (assigneeId) where.assigneeId = assigneeId;
    if (projectId) where.projectId = projectId;
    if (result) where.result = result;
    if (status === "PENDING") where.completedDate = null;
    if (status === "COMPLETED") where.completedDate = { not: null };

    const [total, items] = await Promise.all([
      prisma.fieldInspection.count({ where }),
      prisma.fieldInspection.findMany({
        where,
        include: { asset: { select: { id: true, name: true, type: true } }, project: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async complete(id: string, data: CompleteInspectionInput) {
    const existing = await prisma.fieldInspection.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", `Inspection '${id}' not found`);

    const inspection = await prisma.fieldInspection.update({
      where: { id },
      data: {
        completedDate: data.completedDate ?? new Date(),
        result: data.result as any,
        checklist: data.checklist,
        photos: data.photos,
        notes: data.notes,
        evidenceUrls: data.evidenceUrls,
      },
    });

    // Log to project/asset history
    if (existing.projectId) {
      await prisma.projectHistory.create({
        data: {
          projectId: existing.projectId,
          event: "INSPECTION",
          description: `Field inspection completed: ${data.result}`,
          evidenceUrls: data.evidenceUrls,
          actor: "FIELD_OFFICER",
        },
      });
    }

    logger.info(`[inspection] Completed ${id} with result ${data.result}`);
    return inspection;
  },

  async assign(id: string, assigneeId: string) {
    return prisma.fieldInspection.update({
      where: { id },
      data: { assigneeId },
    });
  },

  async getStats() {
    const [total, pending, completed, byResult] = await Promise.all([
      prisma.fieldInspection.count(),
      prisma.fieldInspection.count({ where: { completedDate: null } }),
      prisma.fieldInspection.count({ where: { completedDate: { not: null } } }),
      prisma.fieldInspection.groupBy({ by: ["result"], _count: true }),
    ]);

    return {
      total: Number(total),
      pending: Number(pending),
      completed: Number(completed),
      byResult: Object.fromEntries(byResult.map((r) => [r.result ?? "PENDING", r._count])),
    };
  },

  async getMyInspections(assigneeId: string) {
    return prisma.fieldInspection.findMany({
      where: {
        assigneeId,
        completedDate: null,
      },
      include: {
        asset: { select: { id: true, name: true, type: true, district: true } },
        project: { select: { id: true, name: true, district: true } },
      },
      orderBy: { scheduledDate: "asc" },
    });
  },
};
