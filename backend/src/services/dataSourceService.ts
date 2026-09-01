/**
 * Data Source Service — Phase 43: Data Source Management
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export interface CreateDataSourceInput {
  sourceName: string;
  datasetName: string;
  department?: string;
  officialUrl?: string;
  lastUpdated?: Date;
  format?: string;
  apiAvailable?: boolean;
  downloadAvailable?: boolean;
  notes?: string;
}

export const dataSourceService = {
  async create(data: CreateDataSourceInput) {
    return prisma.dataSource.create({ data });
  },

  async findById(id: string) {
    const ds = await prisma.dataSource.findUnique({ where: { id } });
    if (!ds) throw new AppError(404, "NOT_FOUND", `DataSource '${id}' not found`);
    return ds;
  },

  async list(opts?: { status?: string; department?: string; page?: number; limit?: number }) {
    const { status, department, page = 1, limit = 50 } = opts ?? {};
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (department) where.department = { contains: department };

    const [total, items] = await Promise.all([
      prisma.dataSource.count({ where }),
      prisma.dataSource.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async update(id: string, data: Partial<CreateDataSourceInput>) {
    return prisma.dataSource.update({ where: { id }, data });
  },

  async refreshStatus(id: string) {
    const ds = await prisma.dataSource.findUnique({ where: { id } });
    if (!ds) throw new AppError(404, "NOT_FOUND", `DataSource '${id}' not found`);

    const now = new Date();
    const lastUpdated = ds.lastUpdated ?? ds.createdAt;
    const daysSince = Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

    let status = "ACTIVE";
    if (daysSince > 90) status = "DEPRECATED";
    else if (daysSince > 30) status = "STALE";
    else if (!ds.lastFetched) status = "UNAVAILABLE";

    return prisma.dataSource.update({
      where: { id },
      data: { status: status as any, lastFetched: now },
    });
  },

  async checkFreshness(sourceName: string, datasetName: string) {
    const existing = await prisma.dataFreshness.findUnique({
      where: { sourceName_datasetName: { sourceName, datasetName } },
    });

    if (!existing) return { status: "UNKNOWN" };
    if (!existing.lastUpdated) return { status: "UNKNOWN" };

    const now = new Date();
    const daysSince = Math.floor((now.getTime() - existing.lastUpdated.getTime()) / (1000 * 60 * 60 * 24));

    let status = "FRESH";
    if (daysSince > existing.thresholdDays * 3) status = "STALE";
    else if (daysSince > existing.thresholdDays) status = "AGING";
    else if (daysSince > existing.thresholdDays * 7) status = "UNAVAILABLE";

    return { ...existing, status, daysSince };
  },

  async updateFreshness(sourceName: string, datasetName: string, lastUpdated: Date) {
    return prisma.dataFreshness.upsert({
      where: { sourceName_datasetName: { sourceName, datasetName } },
      create: { sourceName, datasetName, lastUpdated },
      update: { lastUpdated, status: "FRESH" },
    });
  },

  async getStats() {
    const [total, byStatus] = await Promise.all([
      prisma.dataSource.count(),
      prisma.dataSource.groupBy({ by: ["status"], _count: true }),
    ]);

    return {
      total: Number(total),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
    };
  },
};
