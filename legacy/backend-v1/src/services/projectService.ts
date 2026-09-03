import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";
import type { ProjectStatus, ProjectSector } from "@prisma/client";

export interface CreateProjectInput {
  name: string;
  description?: string;
  status?: ProjectStatus;
  sector: ProjectSector;
  district: string;
  constituency?: string;
  state: string;
  approvedAmount: number;
  spentAmount?: number;
  contractor?: string;
  startDate?: string;
  expectedEndDate?: string;
  createdById?: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  status?: ProjectStatus;
  sector?: ProjectSector;
  district?: string;
  constituency?: string;
  state?: string;
  approvedAmount?: number;
  spentAmount?: number;
  contractor?: string;
  startDate?: string;
  expectedEndDate?: string;
  completedAt?: string;
}

export interface ProjectFilters {
  status?: ProjectStatus;
  sector?: ProjectSector;
  district?: string;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const projectService = {
  async create(input: CreateProjectInput): Promise<any> {
    const project = await prisma.project.create({
      data: {
        name: input.name.trim(),
        description: input.description?.trim() ?? null,
        status: input.status ?? "PROPOSED",
        sector: input.sector,
        district: input.district.trim(),
        constituency: input.constituency?.trim() ?? null,
        state: input.state.trim(),
        approvedAmount: input.approvedAmount,
        spentAmount: input.spentAmount ?? 0,
        contractor: input.contractor?.trim() ?? null,
        startDate: input.startDate ? new Date(input.startDate) : null,
        expectedEndDate: input.expectedEndDate ? new Date(input.expectedEndDate) : null,
        createdById: input.createdById ?? null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    return project;
  },

  async findAll(filters: ProjectFilters): Promise<PaginatedResult<any>> {
    const page = Math.max(1, filters.page ?? DEFAULT_PAGE);
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.sector) {
      where.sector = filters.sector;
    }

    if (filters.district) {
      where.district = { contains: filters.district };
    }

    if (filters.state) {
      where.state = { contains: filters.state };
    }

    if (filters.search) {
      const s = filters.search;
      where.OR = [
        { name: { contains: s } },
        { description: { contains: s } },
        { district: { contains: s } },
        { contractor: { contains: s } },
      ];
    }

    const [items, total] = await Promise.all([
      prisma.project.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.project.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  },

  async findById(id: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${id}' not found`);
    }

    return project;
  },

  async update(id: string, input: UpdateProjectInput): Promise<any> {
    // Check project exists
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${id}' not found`);
    }

    const updateData: any = {};

    if (input.name !== undefined) updateData.name = input.name.trim();
    if (input.description !== undefined) updateData.description = input.description?.trim() ?? null;
    if (input.status !== undefined) updateData.status = input.status;
    if (input.sector !== undefined) updateData.sector = input.sector;
    if (input.district !== undefined) updateData.district = input.district.trim();
    if (input.constituency !== undefined) updateData.constituency = input.constituency?.trim() ?? null;
    if (input.state !== undefined) updateData.state = input.state.trim();
    if (input.approvedAmount !== undefined) updateData.approvedAmount = input.approvedAmount;
    if (input.spentAmount !== undefined) updateData.spentAmount = input.spentAmount;
    if (input.contractor !== undefined) updateData.contractor = input.contractor?.trim() ?? null;
    if (input.startDate !== undefined) updateData.startDate = input.startDate ? new Date(input.startDate) : null;
    if (input.expectedEndDate !== undefined) updateData.expectedEndDate = input.expectedEndDate ? new Date(input.expectedEndDate) : null;
    if (input.completedAt !== undefined) updateData.completedAt = input.completedAt ? new Date(input.completedAt) : null;

    const project = await prisma.project.update({
      where: { id },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return project;
  },

  async delete(id: string): Promise<void> {
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${id}' not found`);
    }

    await prisma.project.delete({ where: { id } });
  },

  async count(filters?: ProjectFilters): Promise<number> {
    const where: any = {};

    if (filters?.status) where.status = filters.status;
    if (filters?.sector) where.sector = filters.sector;
    if (filters?.district) where.district = { contains: filters.district };
    if (filters?.state) where.state = { contains: filters.state };
    if (filters?.search) {
      const s = filters.search;
      where.OR = [
        { name: { contains: s } },
        { description: { contains: s } },
      ];
    }

    return prisma.project.count({ where });
  },

  async getStats(): Promise<{
    total: number;
    byStatus: Record<string, number>;
    bySector: Record<string, number>;
    totalBudget: number;
    totalSpent: number;
  }> {
    const [total, financials, byStatus, bySector] = await Promise.all([
      prisma.project.count(),
      prisma.project.aggregate({ _sum: { approvedAmount: true, spentAmount: true } }),
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["sector"],
        _count: true,
      }),
    ]);

    const totalBudget = Number(financials._sum.approvedAmount ?? 0);
    const totalSpent = Number(financials._sum.spentAmount ?? 0);

    const statusMap: Record<string, number> = {};
    for (const s of byStatus) {
      statusMap[s.status] = s._count;
    }

    const sectorMap: Record<string, number> = {};
    for (const s of bySector) {
      sectorMap[s.sector] = s._count;
    }

    return { total, byStatus: statusMap, bySector: sectorMap, totalBudget, totalSpent };
  },

  /**
   * Rich detail view — returns project with all related data.
   * Used by the project detail page to show everything at once.
   */
  async findDetail(id: string): Promise<any> {
    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true, role: true },
        },
        mp: true,
        locations: {
          orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        },
        reports: {
          include: {
            attachments: { select: { id: true, filename: true, originalName: true, mimeType: true, size: true } },
            statusLogs: { orderBy: { createdAt: "asc" } },
          },
          orderBy: { createdAt: "desc" },
        },
        expenditures: {
          include: {
            vendorEntity: {
              select: { id: true, name: true, state: true, district: true },
            },
          },
          orderBy: { paidOn: "desc" },
        },
        anomalies: {
          orderBy: { createdAt: "desc" },
        },
        risk: true,
        documents: {
          orderBy: { uploadedAt: "desc" },
        },
      },
    });

    if (!project) {
      throw new AppError(404, "NOT_FOUND", `Project with id '${id}' not found`);
    }

    // Derive vendor from expenditures if no contractor field
    let vendor = null;
    if (project.expenditures && project.expenditures.length > 0) {
      const firstExp = project.expenditures[0];
      if (firstExp.vendorEntity) {
        vendor = firstExp.vendorEntity;
      }
    }

    // Summary stats
    const totalExpenditure = project.expenditures
      ? project.expenditures.reduce((sum, e) => sum + e.amount, 0)
      : 0;
    const paidExpenditure = project.expenditures
      ? project.expenditures
          .filter((e) => e.status === "PAID")
          .reduce((sum, e) => sum + e.amount, 0)
      : 0;
    const pendingExpenditure = project.expenditures
      ? project.expenditures
          .filter((e) => e.status === "PENDING" || e.status === "AUTHORIZED")
          .reduce((sum, e) => sum + e.amount, 0)
      : 0;

    return {
      ...project,
      vendor,
      expenditureSummary: {
        total: totalExpenditure,
        paid: paidExpenditure,
        pending: pendingExpenditure,
        count: project.expenditures?.length ?? 0,
      },
    };
  },

  /**
   * Derive works/phase breakdown from project name + sector + status.
   * Returns ordered array of work phases with computed status from project lifecycle.
   */
  parseWorks(project: {
    sector: string;
    status: string;
    startDate?: Date | null;
    expectedEndDate?: Date | null;
    completedAt?: Date | null;
  }): Array<{ name: string; status: "completed" | "active" | "pending" | "delayed" | "skipped"; pct: number }> {
    // Phase templates by sector category
    const templates: Record<string, string[]> = {
      CONSTRUCTION: ["Site Survey & Clearance", "Foundation & Excavation", "Superstructure", "Roofing & Finishing", "Handover & Inspection"],
      WATER: ["Survey & Design", "Pipeline Laying", "Tank / Structure", "Testing & Flushing", "Commissioning"],
      EDUCATION: ["Site Preparation", "Foundation", "Building Structure", "Electrification & Plumbing", "Furnishing & Handover"],
      HEALTH: ["Site & Permits", "Foundation", "Building Structure", "Equipment Installation", "Handover"],
      TRANSPORT: ["Survey & Marking", "Earthwork & Embankment", "Base Course", "Surface & Marking", "Handover"],
      ENERGY: ["Survey & DPR", "Material Procurement", "Installation", "Testing & Grid Tie", "Commissioning"],
      AGRICULTURE: ["Site Survey", "Land Preparation", "Infrastructure", "Planting / Equipment", "Handover"],
      HOUSING: ["Beneficiary Selection", "Foundation", "Superstructure", "Finishing & Amenities", "Handover"],
      DEFAULT: ["Planning & Approval", "Procurement", "Execution", "Quality Check", "Handover"],
    };

    const sectorToCategory: Record<string, keyof typeof templates> = {
      PUBLIC_INFRASTRUCTURE: "CONSTRUCTION",
      HOUSING: "HOUSING",
      HEALTH: "HEALTH",
      EDUCATION: "EDUCATION",
      TRANSPORT: "TRANSPORT",
      WATER_SANITATION: "WATER",
      ENERGY: "ENERGY",
      AGRICULTURE: "AGRICULTURE",
    };

    const category = sectorToCategory[project.sector] ?? "DEFAULT";
    const phaseNames = templates[category];

    // Compute overall progress (0-100) from status
    const statusPct: Record<string, number> = {
      PROPOSED: 5,
      UNSANCTIONED: 0,
      APPROVED: 15,
      IN_PROGRESS: 50,
      COMPLETED: 90,
      VERIFIED: 100,
      CANCELLED: 0,
    };
    const overallPct = statusPct[project.status] ?? 0;

    // Map overallPct to "which phase is currently active"
    // Each phase occupies a 20% slice: 0-20, 20-40, 40-60, 60-80, 80-100
    const activePhaseIdx = Math.min(4, Math.floor(overallPct / 20));
    const withinPhasePct = overallPct - activePhaseIdx * 20; // 0-20 within current phase

    // Calculate whether project is delayed
    const isDelayed = project.expectedEndDate
      ? project.status !== "COMPLETED" &&
        project.status !== "VERIFIED" &&
        new Date(project.expectedEndDate) < new Date()
      : false;

    return phaseNames.map((name, i) => {
      let status: "completed" | "active" | "pending" | "delayed" | "skipped";
      let pct: number;

      if (project.status === "CANCELLED") {
        status = "skipped";
        pct = 0;
      } else if (i < activePhaseIdx) {
        status = "completed";
        pct = 100;
      } else if (i === activePhaseIdx) {
        if (isDelayed && withinPhasePct < 20) {
          status = "delayed";
          pct = withinPhasePct;
        } else {
          status = "active";
          pct = withinPhasePct;
        }
      } else {
        status = "pending";
        pct = 0;
      }

      return { name, status, pct };
    });
  },
};
