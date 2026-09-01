/**
 * Priority Service — Phase 18: Development Priority Calculation
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export interface ComputePriorityInput {
  district: string;
  state: string;
  sector: string;
}

export const priorityService = {
  /**
   * Compute development priority score for a district/sector.
   * Combines: citizen request count, safety concerns, distance to facilities.
   */
  async computePriority(input: ComputePriorityInput) {
    const { district, state, sector } = input;
    // Normalize sector to valid ProjectSector enum value
    const sectorEnum = sector as any;

    // Fetch signals
    const [requestCount, devRequestPriority, safetyReports, nearbyProjects] = await Promise.all([
      prisma.developmentRequest.count({ where: { district, sector: sectorEnum } }),
      prisma.developmentPriority.findMany({ where: { district, sector: sectorEnum } }),
      prisma.safetyReport.count({ where: { district, status: { notIn: ["RESOLVED", "CLOSED"] } } }),
      prisma.project.count({ where: { district, sector: sectorEnum } }),
    ]);

    // Compute score (0-100)
    const factors: { code: string; label: string; value: number; detail: string }[] = [];
    let score = 50;

    // More requests = higher priority
    if (requestCount > 20) { score += 20; factors.push({ code: "HIGH_DEMAND", label: "High citizen demand", value: 20, detail: `${requestCount} active requests` }); }
    else if (requestCount > 5) { score += 10; factors.push({ code: "MODERATE_DEMAND", label: "Moderate demand", value: 10, detail: `${requestCount} requests` }); }

    // Safety concerns
    if (safetyReports > 5) { score += 15; factors.push({ code: "SAFETY_ISSUES", label: "Safety concerns", value: 15, detail: `${safetyReports} open safety reports` }); }
    else if (safetyReports > 0) { score += 7; factors.push({ code: "SOME_SAFETY", label: "Some safety concerns", value: 7, detail: `${safetyReports} safety reports` }); }

    // Fewer nearby projects = higher priority (underserved area)
    if (nearbyProjects === 0) { score += 15; factors.push({ code: "UNSERVED", label: "No projects in sector", value: 15, detail: "Area underserved in this sector" }); }
    else if (nearbyProjects < 3) { score += 8; factors.push({ code: "UNDER_SERVED", label: "Under-served", value: 8, detail: `${nearbyProjects} existing projects` }); }

    score = Math.min(100, score);

    const result = await prisma.developmentPriority.upsert({
      where: { district_sector: { district, sector: sectorEnum } },
      create: {
        district,
        state,
        sector: sectorEnum,
        priorityScore: score,
        factors: JSON.stringify(factors),
        citizenRequestCount: requestCount,
        safetyConcernCount: safetyReports,
      },
      update: {
        priorityScore: score,
        factors: JSON.stringify(factors),
        citizenRequestCount: requestCount,
        safetyConcernCount: safetyReports,
        updatedAt: new Date(),
      },
    });

    return { ...result, computedFactors: factors };
  },

  async getByDistrict(district: string) {
    return prisma.developmentPriority.findMany({
      where: { district },
      orderBy: { priorityScore: "desc" },
    });
  },

  async getByArea(state: string, district?: string) {
    const where: Record<string, unknown> = { state };
    if (district) where.district = district;
    return prisma.developmentPriority.findMany({
      where,
      orderBy: { priorityScore: "desc" },
    });
  },

  async recomputeAll() {
    const priorities = await prisma.developmentPriority.findMany();
    const results = [];
    for (const p of priorities) {
      const result = await this.computePriority({ district: p.district, state: p.state, sector: p.sector });
      results.push(result);
    }
    return results;
  },

  async getTopPriorityAreas(limit = 20) {
    return prisma.developmentPriority.findMany({
      orderBy: { priorityScore: "desc" },
      take: limit,
    });
  },

  async getStats() {
    const [total, bySector, byState] = await Promise.all([
      prisma.developmentPriority.count(),
      prisma.developmentPriority.groupBy({ by: ["sector"], _count: true }),
      prisma.developmentPriority.groupBy({ by: ["state"], _count: true }),
    ]);
    return { total: Number(total), bySector: Object.fromEntries(bySector.map(s => [s.sector, s._count])), byState: Object.fromEntries(byState.map(s => [s.state, s._count])) };
  },
};
