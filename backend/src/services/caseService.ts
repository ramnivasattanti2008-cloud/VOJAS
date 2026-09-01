/**
 * Case Service — Phase 24: Case Management
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import { logger } from "../utils/logger.js";

export interface CreateCaseInput {
  title: string;
  description: string;
  type: string;
  priority?: string;
  projectId?: string;
  reportId?: string;
  anomalyId?: string;
  assignedToId?: string;
}

export const caseService = {
  async create(data: CreateCaseInput) {
    const case_ = await prisma.case.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type as any,
        priority: (data.priority as any) ?? "MEDIUM",
        status: data.assignedToId ? "ASSIGNED" : "OPEN",
        projectId: data.projectId,
        reportId: data.reportId,
        anomalyId: data.anomalyId,
        assignedToId: data.assignedToId,
      },
    });

    await prisma.caseStatusLog.create({
      data: { caseId: case_.id, toStatus: case_.status },
    });

    return case_;
  },

  async findById(id: string) {
    const case_ = await prisma.case.findUnique({
      where: { id },
      include: {
        statusLogs: { orderBy: { createdAt: "desc" } },
        evidence: { orderBy: { createdAt: "desc" } },
        referrals: { orderBy: { createdAt: "desc" } },
        packages: { orderBy: { generatedAt: "desc" } },
        project: { select: { id: true, name: true, district: true, sector: true } },
      },
    });
    if (!case_) throw new AppError(404, "NOT_FOUND", `Case '${id}' not found`);
    return case_;
  },

  async list(opts: {
    status?: string;
    type?: string;
    priority?: string;
    assignedToId?: string;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { status, type, priority, assignedToId, page = 1, limit = 50, search } = opts;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (priority) where.priority = priority;
    if (assignedToId) where.assignedToId = assignedToId;
    if (search) where.title = { contains: search };

    const [total, items] = await Promise.all([
      prisma.case.count({ where }),
      prisma.case.findMany({
        where,
        include: {
          project: { select: { id: true, name: true } },
          _count: { select: { evidence: true, referrals: true } },
        },
        orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return {
      items: items.map((c) => ({
        ...c,
        evidenceCount: (c as typeof c & { _count: { evidence: number } })._count.evidence,
        referralCount: (c as typeof c & { _count: { referrals: number } })._count.referrals,
      })),
      total: Number(total),
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async assign(id: string, assignedToId: string) {
    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", `Case '${id}' not found`);

    await prisma.caseStatusLog.create({
      data: {
        caseId: id,
        fromStatus: existing.status,
        toStatus: "ASSIGNED",
        notes: `Assigned to user ${assignedToId}`,
      },
    });

    return prisma.case.update({
      where: { id },
      data: { assignedToId, status: "ASSIGNED" },
    });
  },

  async transition(id: string, newStatus: string, notes?: string, userId?: string) {
    const existing = await prisma.case.findUnique({ where: { id } });
    if (!existing) throw new AppError(404, "NOT_FOUND", `Case '${id}' not found`);

    await prisma.caseStatusLog.create({
      data: {
        caseId: id,
        fromStatus: existing.status,
        toStatus: newStatus as any,
        changedById: userId,
        notes,
      },
    });

    const updateData: Record<string, unknown> = { status: newStatus as any };
    if (newStatus === "CLOSED") updateData.closedAt = new Date();

    return prisma.case.update({ where: { id }, data: updateData });
  },

  async addEvidence(caseId: string, data: { type: string; title: string; description?: string; url?: string; source?: string; strength?: string; addedById?: string }) {
    return prisma.caseEvidence.create({
      data: { caseId, ...data },
    });
  },

  async getTimeline(id: string) {
    const case_ = await prisma.case.findUnique({
      where: { id },
      include: {
        statusLogs: { orderBy: { createdAt: "asc" } },
        evidence: { orderBy: { createdAt: "asc" } },
        referrals: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!case_) throw new AppError(404, "NOT_FOUND", `Case '${id}' not found`);

    const timeline = [
      ...case_.statusLogs.map((l) => ({ type: "STATUS_CHANGE", date: l.createdAt, detail: `${l.fromStatus ?? "NEW"} → ${l.toStatus}`, notes: l.notes })),
      ...case_.evidence.map((e) => ({ type: "EVIDENCE", date: e.createdAt, detail: `[${e.type}] ${e.title}`, notes: e.description ?? undefined })),
      ...case_.referrals.map((r) => ({ type: "REFERRAL", date: r.createdAt, detail: `Referred to ${r.authority} (${r.status})`, notes: r.summary })),
    ];

    return timeline.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  },

  async getStats() {
    const [total, byStatus, byType, byPriority] = await Promise.all([
      prisma.case.count(),
      prisma.case.groupBy({ by: ["status"], _count: true }),
      prisma.case.groupBy({ by: ["type"], _count: true }),
      prisma.case.groupBy({ by: ["priority"], _count: true }),
    ]);

    return {
      total: Number(total),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
      byType: Object.fromEntries(byType.map((r) => [r.type, r._count])),
      byPriority: Object.fromEntries(byPriority.map((r) => [r.priority, r._count])),
    };
  },
};
