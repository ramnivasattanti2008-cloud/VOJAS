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
      where.district = { contains: filters.district, mode: "insensitive" };
    }

    if (filters.state) {
      where.state = { contains: filters.state, mode: "insensitive" };
    }

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
        { district: { contains: filters.search, mode: "insensitive" } },
        { contractor: { contains: filters.search, mode: "insensitive" } },
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
    if (filters?.district) where.district = { contains: filters.district, mode: "insensitive" };
    if (filters?.state) where.state = { contains: filters.state, mode: "insensitive" };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
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
    const [total, allProjects, byStatus, bySector] = await Promise.all([
      prisma.project.count(),
      prisma.project.findMany({ select: { approvedAmount: true, spentAmount: true } }),
      prisma.project.groupBy({
        by: ["status"],
        _count: true,
      }),
      prisma.project.groupBy({
        by: ["sector"],
        _count: true,
      }),
    ]);

    const totalBudget = allProjects.reduce((sum, p) => sum + p.approvedAmount, 0);
    const totalSpent = allProjects.reduce((sum, p) => sum + p.spentAmount, 0);

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
};
