import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ExpenditureCategory, PaymentStatus } from "@prisma/client";

export interface CreateExpenditureInput {
  projectId: string;
  amount: number;
  category: ExpenditureCategory;
  description: string;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: string;
  status?: PaymentStatus;
  notes?: string;
  createdById?: string;
}

export interface UpdateExpenditureInput {
  amount?: number;
  category?: ExpenditureCategory;
  description?: string;
  vendor?: string;
  invoiceNo?: string;
  paidOn?: string;
  status?: PaymentStatus;
  notes?: string;
}

export interface ExpenditureFilters {
  category?: ExpenditureCategory;
  status?: PaymentStatus;
  page?: number;
  limit?: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

// Allowed status transitions
const ALLOWED_TRANSITIONS: Record<PaymentStatus, PaymentStatus[]> = {
  PENDING:    ["AUTHORIZED", "REJECTED"],
  AUTHORIZED: ["PAID", "REJECTED", "REVERSED"],
  PAID:       ["REVERSED"],
  REJECTED:   [],
  REVERSED:   [],
};

export const expenditureService = {
  // ── Create ───────────────────────────────────────────────────────────────
  async create(input: CreateExpenditureInput) {
    // Verify project exists
    const project = await prisma.project.findUnique({ where: { id: input.projectId } });
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${input.projectId}' not found`);
    }

    const expenditure = await prisma.expenditure.create({
      data: {
        projectId: input.projectId,
        amount: input.amount,
        category: input.category,
        description: input.description.trim(),
        vendor: input.vendor?.trim() ?? null,
        invoiceNo: input.invoiceNo?.trim() ?? null,
        paidOn: input.paidOn ? new Date(input.paidOn) : null,
        status: input.status ?? "PENDING",
        notes: input.notes?.trim() ?? null,
        createdById: input.createdById ?? null,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        project: { select: { id: true, name: true, approvedAmount: true, spentAmount: true } },
      },
    });

    return expenditure;
  },

  // ── List (for a project) ─────────────────────────────────────────────────
  async findByProject(projectId: string, filters: ExpenditureFilters) {
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${projectId}' not found`);
    }

    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = { projectId };
    if (filters.category) where.category = filters.category;
    if (filters.status)   where.status   = filters.status;

    const [items, total] = await Promise.all([
      prisma.expenditure.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { id: true, name: true, email: true } },
        },
      }),
      prisma.expenditure.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  // ── Get one ──────────────────────────────────────────────────────────────
  async findById(id: string) {
    const expenditure = await prisma.expenditure.findUnique({
      where: { id },
      include: {
        createdBy: { select: { id: true, name: true, email: true, role: true } },
        project:   { select: { id: true, name: true, district: true, state: true, approvedAmount: true, spentAmount: true } },
      },
    });
    if (!expenditure) {
      throw new AppError(404, "NOT_FOUND", `Expenditure with id '${id}' not found`);
    }
    return expenditure;
  },

  // ── Update ───────────────────────────────────────────────────────────────
  async update(id: string, input: UpdateExpenditureInput) {
    const existing = await prisma.expenditure.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Expenditure with id '${id}' not found`);
    }

    const updateData: any = {};
    if (input.amount      !== undefined) updateData.amount      = input.amount;
    if (input.category    !== undefined) updateData.category    = input.category;
    if (input.description !== undefined) updateData.description = input.description.trim();
    if (input.vendor      !== undefined) updateData.vendor      = input.vendor?.trim() ?? null;
    if (input.invoiceNo   !== undefined) updateData.invoiceNo   = input.invoiceNo?.trim() ?? null;
    if (input.paidOn      !== undefined) updateData.paidOn      = input.paidOn ? new Date(input.paidOn) : null;
    if (input.status      !== undefined) updateData.status      = input.status;
    if (input.notes       !== undefined) updateData.notes       = input.notes?.trim() ?? null;

    return prisma.expenditure.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // ── Transition status ────────────────────────────────────────────────────
  async transition(id: string, toStatus: PaymentStatus) {
    const existing = await prisma.expenditure.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Expenditure with id '${id}' not found`);
    }

    const allowed = ALLOWED_TRANSITIONS[existing.status] ?? [];
    if (!allowed.includes(toStatus)) {
      throw new AppError(
        400,
        "INVALID_TRANSITION",
        `Cannot transition expenditure from ${existing.status} to ${toStatus}. Allowed: ${allowed.join(", ") || "none"}`
      );
    }

    return prisma.expenditure.update({
      where: { id },
      data: {
        status: toStatus,
        // Auto-set paidOn when moving to PAID if not already set
        paidOn: toStatus === "PAID" && !existing.paidOn ? new Date() : undefined,
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
  },

  // ── Delete ───────────────────────────────────────────────────────────────
  async delete(id: string) {
    const existing = await prisma.expenditure.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Expenditure with id '${id}' not found`);
    }
    await prisma.expenditure.delete({ where: { id } });
  },

  // ── Project-level financial overview ─────────────────────────────────────
  async getProjectFinancials(projectId: string) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, name: true, approvedAmount: true, spentAmount: true },
    });
    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${projectId}' not found`);
    }

    const expenditures = await prisma.expenditure.findMany({
      where: { projectId },
      select: { amount: true, category: true, status: true },
    });

    const totals = {
      approved:    project.approvedAmount,
      spent:       0,         // PAID only — actual money out
      authorized:  0,         // AUTHORIZED (committed, not paid)
      pending:     0,         // PENDING (recorded, not sanctioned)
      count:       expenditures.length,
    };

    const byCategory: Record<string, { count: number; total: number }> = {};
    const byStatus: Record<string, { count: number; total: number }> = {};

    for (const e of expenditures) {
      if (e.status === "PAID")      totals.spent      += e.amount;
      if (e.status === "AUTHORIZED") totals.authorized += e.amount;
      if (e.status === "PENDING")   totals.pending    += e.amount;

      if (!byCategory[e.category]) byCategory[e.category] = { count: 0, total: 0 };
      byCategory[e.category].count += 1;
      byCategory[e.category].total += e.amount;

      if (!byStatus[e.status]) byStatus[e.status] = { count: 0, total: 0 };
      byStatus[e.status].count += 1;
      byStatus[e.status].total += e.amount;
    }

    const committed  = totals.spent + totals.authorized; // total money committed
    const remaining  = totals.approved - committed;      // funds still available
    const utilization = totals.approved > 0 ? (committed / totals.approved) * 100 : 0;
    const overrun     = committed > totals.approved;     // spent more than approved

    return {
      project,
      approved:    totals.approved,
      spent:       totals.spent,
      authorized:  totals.authorized,
      pending:     totals.pending,
      committed,
      remaining:   Math.max(0, remaining),
      utilization: Math.round(utilization * 10) / 10,
      overrun,
      count:       totals.count,
      byCategory,
      byStatus,
    };
  },

  // ── Scheme-wide financial overview ───────────────────────────────────────
  async getSchemeFinancials() {
    const [projects, expenditures, byCategory, byStatus] = await Promise.all([
      prisma.project.findMany({
        select: { id: true, name: true, district: true, state: true, status: true, approvedAmount: true, spentAmount: true },
      }),
      prisma.expenditure.findMany({
        select: { amount: true, category: true, status: true, projectId: true },
      }),
      prisma.expenditure.groupBy({
        by: ["category"],
        _sum: { amount: true },
        _count: true,
      }),
      prisma.expenditure.groupBy({
        by: ["status"],
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    const totalBudget = projects.reduce((s, p) => s + p.approvedAmount, 0);
    const totalRecordedSpent = projects.reduce((s, p) => s + p.spentAmount, 0);

    let totalSpent = 0;      // PAID
    let totalAuthorized = 0; // AUTHORIZED
    let totalPending = 0;    // PENDING

    for (const e of expenditures) {
      if (e.status === "PAID")       totalSpent      += e.amount;
      if (e.status === "AUTHORIZED") totalAuthorized += e.amount;
      if (e.status === "PENDING")    totalPending    += e.amount;
    }

    const projectBreakdown = projects.map((p) => {
      const projExp = expenditures.filter((e) => e.projectId === p.id);
      const spent = projExp.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amount, 0);
      const committed = projExp.filter((e) => e.status === "PAID" || e.status === "AUTHORIZED").reduce((s, e) => s + e.amount, 0);
      return {
        projectId:     p.id,
        name:          p.name,
        district:      p.district,
        state:         p.state,
        status:        p.status,
        approved:      p.approvedAmount,
        spent,
        committed,
        remaining:     Math.max(0, p.approvedAmount - committed),
        utilization:   p.approvedAmount > 0 ? Math.round((committed / p.approvedAmount) * 1000) / 10 : 0,
        expenditureCount: projExp.length,
      };
    });

    return {
      projectCount:      projects.length,
      totalBudget,
      totalRecordedSpent,
      totalSpent,
      totalAuthorized,
      totalPending,
      committed:           totalSpent + totalAuthorized,
      remaining:           totalBudget - (totalSpent + totalAuthorized),
      utilization:         totalBudget > 0 ? Math.round(((totalSpent + totalAuthorized) / totalBudget) * 1000) / 10 : 0,
      expenditureCount:   expenditures.length,
      byCategory: byCategory.map((c) => ({ category: c.category, count: c._count, total: c._sum.amount ?? 0 })),
      byStatus:   byStatus.map((s) => ({ status: s.status, count: s._count, total: s._sum.amount ?? 0 })),
      topProjects: projectBreakdown
        .sort((a, b) => b.committed - a.committed)
        .slice(0, 10),
      projects: projectBreakdown,
    };
  },
};
