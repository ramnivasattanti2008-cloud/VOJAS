/**
 * Guideline Service — Phase 41: Legislative / Guideline Audit
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export interface CreateGuidelineInput {
  title: string;
  description?: string;
  category: string;
  referenceNo?: string;
  issuingBody?: string;
  url?: string;
  content?: string;
  sector?: string;
}

export const guidelineService = {
  async create(data: CreateGuidelineInput) {
    return prisma.guideline.create({ data: { ...data, sector: data.sector as any } });
  },

  async findById(id: string) {
    const g = await prisma.guideline.findUnique({ where: { id } });
    if (!g) throw new AppError(404, "NOT_FOUND", `Guideline '${id}' not found`);
    return g;
  },

  async search(query: string, category?: string, sector?: string) {
    const where: Record<string, unknown> = {
      OR: [
        { title: { contains: query } },
        { description: { contains: query } },
        { referenceNo: { contains: query } },
        { content: { contains: query } },
      ],
    };
    if (category) where.category = category;
    if (sector) where.sector = sector;

    return prisma.guideline.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 50,
    });
  },

  async list(opts?: { category?: string; sector?: string; page?: number; limit?: number }) {
    const { category, sector, page = 1, limit = 50 } = opts ?? {};
    const where: Record<string, unknown> = {};
    if (category) where.category = category;
    if (sector) where.sector = sector;

    const [total, items] = await Promise.all([
      prisma.guideline.count({ where }),
      prisma.guideline.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async checkCompliance(projectId: string, guidelineId: string) {
    const check = await prisma.guidelineCheck.findUnique({
      where: { projectId_guidelineId: { projectId, guidelineId } },
    });
    return check;
  },

  async recordComplianceCheck(projectId: string, guidelineId: string, data: {
    isCompliant: boolean;
    nonComplianceNote?: string;
    checkedById?: string;
  }) {
    return prisma.guidelineCheck.upsert({
      where: { projectId_guidelineId: { projectId, guidelineId } },
      create: { projectId, guidelineId, ...data, checkedAt: new Date() },
      update: { ...data, checkedAt: new Date() },
    });
  },

  async getProjectCompliance(projectId: string) {
    return prisma.guidelineCheck.findMany({
      where: { projectId },
      include: { guideline: true },
    });
  },

  async getCategories() {
    const categories = await prisma.guideline.findMany({
      select: { category: true },
      distinct: ["category"],
    });
    return categories.map((r) => r.category);
  },

  async getStats() {
    const [total, byCategory] = await Promise.all([
      prisma.guideline.count(),
      prisma.guideline.groupBy({ by: ["category"], _count: true }),
    ]);

    const complianceStats = await prisma.guidelineCheck.groupBy({
      by: ["isCompliant"],
      _count: true,
    });

    return {
      total: Number(total),
      byCategory: Object.fromEntries(byCategory.map((r) => [r.category, r._count])),
      compliance: Object.fromEntries(complianceStats.map((r) => [String(r.isCompliant), r._count])),
    };
  },
};
