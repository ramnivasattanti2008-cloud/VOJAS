/**
 * Development Request Service — Phase 17: Citizens request new development
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export interface CreateRequestInput {
  title: string;
  description: string;
  sector: string;
  requestType: string;
  district: string;
  state: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  supportingEvidence?: string;
  submittedBy?: string;
}

export const developmentRequestService = {
  async create(data: CreateRequestInput) {
    return prisma.developmentRequest.create({ data: { ...data, sector: data.sector as any } });
  },

  async findById(id: string) {
    const r = await prisma.developmentRequest.findUnique({
      where: { id },
      include: { supports: true },
    });
    if (!r) throw new AppError(404, "NOT_FOUND", `Request '${id}' not found`);
    return r;
  },

  async list(opts: {
    sector?: string;
    district?: string;
    state?: string;
    status?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { sector, district, state, status, page = 1, limit = 50, search } = opts;
    const where: Record<string, unknown> = {};
    if (sector) where.sector = sector;
    if (district) where.district = { contains: district };
    if (state) where.state = { contains: state };
    if (status) where.status = status;
    if (search) where.title = { contains: search };

    const [total, items] = await Promise.all([
      prisma.developmentRequest.count({ where }),
      prisma.developmentRequest.findMany({
        where,
        include: { _count: { select: { supports: true } } },
        orderBy: { priority: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((r) => ({ ...r, supportCount: (r as typeof r & { _count: { supports: number } })._count.supports })),
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async support(requestId: string, data: { supporterName?: string; supporterEmail?: string; isAnonymous?: boolean }) {
    const request = await prisma.developmentRequest.findUnique({ where: { id: requestId } });
    if (!request) throw new AppError(404, "NOT_FOUND", `Request '${requestId}' not found`);
    return prisma.developmentRequestSupport.create({
      data: { requestId, ...data },
    });
  },

  async getGroups(sector?: string) {
    // Group similar requests by district + requestType
    const requests = await prisma.developmentRequest.findMany({
      where: sector ? { sector: sector as any } : {},
      include: { _count: { select: { supports: true } } },
      orderBy: { submittedAt: "desc" },
    });

    // Group by district + requestType
    const groups: Record<string, {
      district: string;
      state: string;
      sector: string;
      requestType: string;
      requests: typeof requests;
      totalSupports: number;
    }> = {};

    for (const r of requests) {
      const key = `${r.district}__${r.requestType}`;
      if (!groups[key]) {
        groups[key] = {
          district: r.district,
          state: r.state,
          sector: r.sector,
          requestType: r.requestType,
          requests: [],
          totalSupports: 0,
        };
      }
      groups[key].requests.push(r);
      groups[key].totalSupports += (r as typeof r & { _count: { supports: number } })._count.supports;
    }

    return Object.values(groups).sort((a, b) => b.totalSupports - a.totalSupports);
  },

  async getPriorityByArea(district: string) {
    return prisma.developmentPriority.findMany({
      where: { district },
      orderBy: { priorityScore: "desc" },
    });
  },

  async updateStatus(id: string, status: string, resolution?: string) {
    return prisma.developmentRequest.update({
      where: { id },
      data: {
        status: status as any,
        ...(resolution ? { resolution, resolvedAt: new Date() } : {}),
      },
    });
  },

  async getStats() {
    const [total, bySector, byStatus, topDistricts] = await Promise.all([
      prisma.developmentRequest.count(),
      prisma.developmentRequest.groupBy({ by: ["sector"], _count: true }),
      prisma.developmentRequest.groupBy({ by: ["status"], _count: true }),
      prisma.$queryRaw<{ district: string; _count: bigint }[]>`
        SELECT district, COUNT(*) as _count FROM DevelopmentRequest GROUP BY district ORDER BY _count DESC LIMIT 10
      `,
    ]);

    return {
      total: Number(total),
      bySector: Object.fromEntries(bySector.map((r) => [r.sector, r._count])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      topDistricts: topDistricts.map((r) => ({ district: r.district, count: Number(r._count) })),
    };
  },
};
