/**
 * Asset Service — Phase 16: Public Asset Health
 * Roads, bridges, public buildings, drainage, water infrastructure, streetlights
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CreateAssetInput {
  name: string;
  type: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  landmark?: string;
  description?: string;
}

export interface UpdateAssetInput {
  name?: string;
  type?: string;
  status?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  landmark?: string;
  description?: string;
  healthScore?: number;
  lastInspectedAt?: Date;
}

// ─── CRUD ─────────────────────────────────────────────────────────────────────

export const assetService = {
  async create(data: CreateAssetInput) {
    return prisma.asset.create({ data: { ...data, type: data.type as any } });
  },

  async findById(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        inspections: { orderBy: { inspectedAt: "desc" }, take: 5 },
        problems: { orderBy: { createdAt: "desc" } },
        history: { orderBy: { createdAt: "desc" }, take: 10 },
        citizenReports: { take: 5, orderBy: { createdAt: "desc" } },
      },
    });
    if (!asset) throw new AppError(404, "NOT_FOUND", `Asset '${id}' not found`);
    return asset;
  },

  async list(opts: {
    type?: string;
    district?: string;
    state?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { type, district, state, status, page = 1, limit = 50, search } = opts;
    const where: Record<string, unknown> = {};
    if (type) where.type = type;
    if (district) where.district = { contains: district };
    if (state) where.state = { contains: state };
    if (status) where.status = status;
    if (search) where.name = { contains: search };

    const [total, items] = await Promise.all([
      prisma.asset.count({ where }),
      prisma.asset.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async update(id: string, data: UpdateAssetInput) {
    // Log history for status change
    if (data.status) {
      const current = await prisma.asset.findUnique({ where: { id }, select: { status: true, name: true } });
      if (current && current.status !== data.status) {
        await prisma.assetHistory.create({
          data: {
            assetId: id,
            event: "STATUS_CHANGE",
            detail: `Status changed from ${current.status} to ${data.status}`,
          },
        });
      }
    }
    return prisma.asset.update({ where: { id }, data: { ...data, type: data.type as any, status: data.status as any } });
  },

  async delete(id: string) {
    await prisma.asset.delete({ where: { id } });
  },

  // ─── Health ────────────────────────────────────────────────────────────────

  async getHealth(id: string) {
    const asset = await prisma.asset.findUnique({
      where: { id },
      include: {
        inspections: {
          orderBy: { inspectedAt: "desc" },
          take: 5,
        },
        problems: {
          where: { status: { notIn: ["RESOLVED", "CLOSED"] } },
        },
      },
    });
    if (!asset) throw new AppError(404, "NOT_FOUND", `Asset '${id}' not found`);

    const latestInspection = asset.inspections[0];
    const openProblems = asset.problems.length;
    const healthScore = latestInspection
      ? this.computeHealthScore(latestInspection.condition)
      : asset.healthScore;

    return {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      healthScore,
      lastInspection: latestInspection,
      openProblems,
      trend: this.getHealthTrend(asset.inspections),
    };
  },

  computeHealthScore(condition: string): number {
    const map: Record<string, number> = {
      "Good": 90, "Operational": 85, "Fair": 65, "Poor": 40, "Critical": 15, "Unknown": 50,
    };
    return map[condition] ?? 50;
  },

  getHealthTrend(inspections: { condition: string; inspectedAt: Date }[]) {
    if (inspections.length < 2) return "STABLE";
    const [latest, prev] = inspections;
    const latestScore = this.computeHealthScore(latest.condition);
    const prevScore = this.computeHealthScore(prev.condition);
    if (latestScore > prevScore + 5) return "IMPROVING";
    if (latestScore < prevScore - 5) return "DECLINING";
    return "STABLE";
  },

  // ─── Inspections ────────────────────────────────────────────────────────────

  async createInspection(assetId: string, data: {
    inspectorId?: string;
    locationDesc?: string;
    latitude?: number;
    longitude?: number;
    condition: string;
    notes?: string;
    photos?: string;
    checklist?: string;
    result?: string;
  }) {
    const asset = await prisma.asset.findUnique({ where: { id: assetId } });
    if (!asset) throw new AppError(404, "NOT_FOUND", `Asset '${assetId}' not found`);

    const inspection = await prisma.assetInspection.create({
      data: {
        assetId,
        inspectorId: data.inspectorId,
        locationDesc: data.locationDesc,
        latitude: data.latitude,
        longitude: data.longitude,
        condition: data.condition,
        notes: data.notes,
        photos: data.photos,
        checklist: data.checklist,
        result: data.result,
      },
    });

    // Update asset health score and last inspected
    await prisma.asset.update({
      where: { id: assetId },
      data: {
        healthScore: this.computeHealthScore(data.condition),
        lastInspectedAt: inspection.inspectedAt,
      },
    });

    // Log history
    await prisma.assetHistory.create({
      data: { assetId, event: "INSPECTION", detail: `Inspected: ${data.condition}` },
    });

    return inspection;
  },

  // ─── Problems ────────────────────────────────────────────────────────────────

  async createProblem(assetId: string, data: { title: string; description?: string; severity?: string; reportedBy?: string }) {
    return prisma.assetProblem.create({
      data: { assetId, ...data },
    });
  },

  async resolveProblem(problemId: string) {
    return prisma.assetProblem.update({
      where: { id: problemId },
      data: { status: "RESOLVED", resolvedAt: new Date() },
    });
  },

  // ─── Stats ─────────────────────────────────────────────────────────────────

  async getStats() {
    const [total, byType, byStatus, avgHealth] = await Promise.all([
      prisma.asset.count(),
      prisma.asset.groupBy({ by: ["type"], _count: true }),
      prisma.asset.groupBy({ by: ["status"], _count: true }),
      prisma.asset.aggregate({ _avg: { healthScore: true } }),
    ]);

    return {
      total: Number(total),
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      avgHealthScore: Math.round(avgHealth._avg.healthScore ?? 0),
    };
  },
};
