/**
 * MP (Member of Parliament) service.
 * CRUD + analytics for the new MP model.
 */
import { prisma } from "../config/database.js";
import type { House, LokSabhaTerm } from "@prisma/client";

export interface CreateMPInput {
  name: string;
  house: House;
  state: string;
  constituency: string;
  term: LokSabhaTerm;
  termStart?: Date;
  termEnd?: Date;
  party?: string;
  lgdCode?: string;
}

export interface MPFilters {
  house?: House;
  term?: LokSabhaTerm;
  state?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface MPPaginatedResult {
  items: any[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export async function findAll(filters: MPFilters = {}): Promise<MPPaginatedResult> {
  const { house, term, state, search, page = 1, limit = 20 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (house) where.house = house;
  if (term) where.term = term;
  if (state) where.state = state.toUpperCase();
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { constituency: { contains: search } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.mP.findMany({ where, skip, take: limit, orderBy: { name: "asc" } }),
    prisma.mP.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function findById(id: string) {
  return prisma.mP.findUnique({
    where: { id },
    include: {
      projects: {
        select: {
          id: true, name: true, status: true, sector: true,
          approvedAmount: true, state: true, district: true,
          recommendedDate: true,
        },
        take: 50,
      },
    },
  });
}

export async function getStats(mpId: string) {
  const projects = await prisma.project.findMany({
    where: { mpId },
    select: { id: true, status: true, approvedAmount: true, spentAmount: true, sector: true, state: true },
  });

  const total = projects.length;
  const totalApproved = projects.reduce((s, p) => s + p.approvedAmount, 0);
  const totalSpent = projects.reduce((s, p) => s + p.spentAmount, 0);
  const anomalies = await prisma.anomaly.count({
    where: { project: { mpId } },
  });

  const byStatus = projects.reduce((acc, p) => {
    acc[p.status] = (acc[p.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const bySector = projects.reduce((acc, p) => {
    acc[p.sector] = (acc[p.sector] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const byState = projects.reduce((acc, p) => {
    acc[p.state] = (acc[p.state] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return {
    totalProjects: total,
    totalApproved,
    totalSpent,
    utilization: totalApproved > 0 ? (totalSpent / totalApproved) * 100 : 0,
    anomalyCount: anomalies,
    byStatus,
    bySector,
    byState,
  };
}

/**
 * Paginated list of projects for a given MP, ordered by recommendedDate desc.
 */
export async function getProjects(
  mpId: string,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where: { mpId },
      skip,
      take: limit,
      orderBy: { recommendedDate: "desc" },
      select: {
        id: true,
        name: true,
        status: true,
        sector: true,
        district: true,
        state: true,
        constituency: true,
        approvedAmount: true,
        spentAmount: true,
        contractor: true,
        startDate: true,
        expectedEndDate: true,
        completedAt: true,
        recommendedDate: true,
      },
    }),
    prisma.project.count({ where: { mpId } }),
  ]);
  return {
    items,
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
}

export async function create(input: CreateMPInput) {
  return prisma.mP.create({ data: input });
}

export async function update(id: string, data: Partial<CreateMPInput>) {
  return prisma.mP.update({ where: { id }, data });
}

export async function remove(id: string) {
  return prisma.mP.delete({ where: { id } });
}
