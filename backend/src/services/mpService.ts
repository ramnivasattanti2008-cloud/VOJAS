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

/**
 * Weekly activity aggregation across all MP's projects.
 * Returns an array of weeks (oldest first) with event counts.
 */
export async function getWeeklyActivity(mpId: string, weeks: number = 12) {
  const now = new Date();
  const weekMs = 7 * 24 * 60 * 60 * 1000;
  const startDate = new Date(now.getTime() - weeks * weekMs);

  // ── Fetch all events in range ─────────────────────────────────────────
  const [projects, expenditures, reports, anomalies] = await Promise.all([
    prisma.project.findMany({
      where: { mpId },
      select: {
        id: true, name: true, status: true,
        startDate: true, expectedEndDate: true, completedAt: true,
      },
    }),
    prisma.expenditure.findMany({
      where: { project: { mpId }, paidOn: { gte: startDate } },
      select: { amount: true, paidOn: true, projectId: true },
    }),
    prisma.report.findMany({
      where: { project: { mpId }, createdAt: { gte: startDate } },
      select: { id: true, createdAt: true, severity: true, projectId: true },
    }),
    prisma.anomaly.findMany({
      where: { project: { mpId }, createdAt: { gte: startDate } },
      select: { id: true, createdAt: true, severity: true, projectId: true },
    }),
  ]);

  // ── Bucket events by week (Mon-Sun) ───────────────────────────────────
  const buckets = new Map<string, {
    weekStart: string;
    projectsStarted: number;
    projectsCompleted: number;
    expenditure: number;
    newReports: number;
    newAnomalies: number;
    criticalAnomalies: number;
    highReports: number;
  }>();

  const weekKey = (d: Date) => {
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day; // Monday-start
    const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() + diff));
    return monday.toISOString().split("T")[0];
  };

  // Initialize all weeks
  for (let i = 0; i < weeks; i++) {
    const d = new Date(now.getTime() - (weeks - 1 - i) * weekMs);
    const k = weekKey(d);
    if (!buckets.has(k)) {
      buckets.set(k, {
        weekStart: k,
        projectsStarted: 0,
        projectsCompleted: 0,
        expenditure: 0,
        newReports: 0,
        newAnomalies: 0,
        criticalAnomalies: 0,
        highReports: 0,
      });
    }
  }

  for (const p of projects) {
    if (p.startDate && p.startDate >= startDate) {
      const k = weekKey(p.startDate);
      const b = buckets.get(k);
      if (b) b.projectsStarted++;
    }
    if (p.completedAt && p.completedAt >= startDate) {
      const k = weekKey(p.completedAt);
      const b = buckets.get(k);
      if (b) b.projectsCompleted++;
    }
  }

  for (const e of expenditures) {
    if (e.paidOn) {
      const k = weekKey(e.paidOn);
      const b = buckets.get(k);
      if (b) b.expenditure += e.amount;
    }
  }

  for (const r of reports) {
    const k = weekKey(r.createdAt);
    const b = buckets.get(k);
    if (b) {
      b.newReports++;
      if (r.severity === "HIGH" || r.severity === "CRITICAL") b.highReports++;
    }
  }

  for (const a of anomalies) {
    const k = weekKey(a.createdAt);
    const b = buckets.get(k);
    if (b) {
      b.newAnomalies++;
      if (a.severity === "CRITICAL" || a.severity === "HIGH") b.criticalAnomalies++;
    }
  }

  const series = Array.from(buckets.values()).sort((a, b) =>
    a.weekStart.localeCompare(b.weekStart)
  );

  // Summary aggregates
  const totalExpenditure = series.reduce((s, w) => s + w.expenditure, 0);
  const totalCompleted = series.reduce((s, w) => s + w.projectsCompleted, 0);
  const totalStarted = series.reduce((s, w) => s + w.projectsStarted, 0);
  const totalAnomalies = series.reduce((s, w) => s + w.newAnomalies, 0);

  return {
    weeks,
    series,
    summary: {
      totalExpenditure,
      totalCompleted,
      totalStarted,
      totalAnomalies,
      avgWeeklyExpenditure: totalExpenditure / weeks,
    },
  };
}

/**
 * Satellite summary across all MP's geocoded projects.
 * Returns aggregate counts + top development projects.
 */
export async function getSatelliteSummary(mpId: string) {
  // Get all geocoded projects
  const projects = await prisma.project.findMany({
    where: { mpId },
    select: {
      id: true,
      name: true,
      district: true,
      state: true,
      status: true,
      sector: true,
      approvedAmount: true,
      locations: { where: { isPrimary: true }, take: 1, select: { latitude: true, longitude: true } },
    },
  });

  const withCoordinates = projects.filter((p) => p.locations.length > 0);
  const withoutCoordinates = projects.length - withCoordinates.length;

  // Derive satellite "development score" deterministically from projectId hash
  // (matches the satellite service's deterministic formula)
  const hashStr = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
  };
  const deriveScore = (projectId: string) => {
    const seed = hashStr(projectId);
    // Sample a representative score: 0-100 with bias towards current status
    const r = ((seed % 1000) / 1000);
    // Bias by status
    const bias: Record<string, number> = {
      PROPOSED: 5,
      APPROVED: 15,
      IN_PROGRESS: 50,
      UNSANCTIONED: 2,
      COMPLETED: 90,
      VERIFIED: 95,
      CANCELLED: 0,
    };
    return Math.min(100, Math.max(0, Math.round(r * 30 + (bias[projects.find(p => p.id === projectId)?.status ?? "PROPOSED"] ?? 0) * 0.7)));
  };

  const statusFromScore = (s: number): string => {
    if (s < 5) return "No Activity";
    if (s < 20) return "Site Cleared";
    if (s < 45) return "Foundation";
    if (s < 75) return "Structure";
    if (s < 95) return "Near Complete";
    return "Completed";
  };

  const withScores = withCoordinates.map((p) => {
    const score = deriveScore(p.id);
    return { ...p, score, statusLabel: statusFromScore(score) };
  });

  const byStatusLabel: Record<string, number> = {};
  let totalScore = 0;
  for (const p of withScores) {
    byStatusLabel[p.statusLabel] = (byStatusLabel[p.statusLabel] || 0) + 1;
    totalScore += p.score;
  }

  const activeConstruction = withScores.filter((p) => p.score > 10 && p.score < 95).length;
  const completed = withScores.filter((p) => p.score >= 95).length;

  // Top 5 by development
  const top = [...withScores].sort((a, b) => b.score - a.score).slice(0, 5);

  return {
    totalProjects: projects.length,
    withCoordinates: withCoordinates.length,
    withoutCoordinates,
    activeConstruction,
    completed: completed + projects.filter((p) => !p.locations.length && (p.status === "COMPLETED" || p.status === "VERIFIED")).length,
    avgDevelopmentScore: withScores.length > 0 ? Math.round(totalScore / withScores.length) : 0,
    byStatusLabel,
    topProjectsByDevelopment: top.map((p) => ({
      id: p.id,
      name: p.name,
      district: p.district,
      state: p.state,
      score: p.score,
      statusLabel: p.statusLabel,
      sector: p.sector,
      approvedAmount: p.approvedAmount,
    })),
  };
}

/**
 * Enhanced project list with locations, expenditures, risk, satellite.
 * Used by MP detail page projects tab.
 */
export async function getProjectsWithDetails(
  mpId: string,
  page: number = 1,
  limit: number = 20,
) {
  const skip = (page - 1) * limit;

  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where: { mpId },
      skip,
      take: limit,
      orderBy: [{ status: "asc" }, { recommendedDate: "desc" }],
      select: {
        id: true,
        name: true,
        description: true,
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
        locations: {
          where: { isPrimary: true },
          take: 1,
          select: { latitude: true, longitude: true, label: true, address: true },
        },
        expenditures: {
          select: { amount: true, status: true, category: true, paidOn: true },
        },
        risk: { select: { overallScore: true, riskLevel: true } },
        anomalies: { select: { id: true, severity: true } },
        documents: { select: { id: true, type: true, status: true } },
      },
    }),
    prisma.project.count({ where: { mpId } }),
  ]);

  // Derive satellite score per project (deterministic, same as summary)
  const hashStr = (s: string) => {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
    return Math.abs(h);
  };
  const deriveScore = (projectId: string, status: string) => {
    const seed = hashStr(projectId);
    const r = (seed % 1000) / 1000;
    const bias: Record<string, number> = {
      PROPOSED: 5, APPROVED: 15, IN_PROGRESS: 50, UNSANCTIONED: 2,
      COMPLETED: 90, VERIFIED: 95, CANCELLED: 0,
    };
    return Math.min(100, Math.max(0, Math.round(r * 30 + (bias[status] ?? 0) * 0.7)));
  };
  const statusFromScore = (s: number) => {
    if (s < 5) return "No Activity";
    if (s < 20) return "Site Cleared";
    if (s < 45) return "Foundation";
    if (s < 75) return "Structure";
    if (s < 95) return "Near Complete";
    return "Completed";
  };

  const enriched = projects.map((p) => {
    const totalExp = p.expenditures.reduce((s, e) => s + e.amount, 0);
    const paidExp = p.expenditures.filter((e) => e.status === "PAID").reduce((s, e) => s + e.amount, 0);
    const docCount = p.documents.length;
    const verifiedDocs = p.documents.filter((d) => d.status === "VERIFIED").length;
    const criticalAnomalies = p.anomalies.filter((a) => a.severity === "CRITICAL").length;
    const score = deriveScore(p.id, p.status);
    return {
      ...p,
      expenditureSummary: {
        total: totalExp,
        paid: paidExp,
        pending: totalExp - paidExp,
        count: p.expenditures.length,
      },
      documentSummary: { total: docCount, verified: verifiedDocs },
      anomalyCount: p.anomalies.length,
      criticalAnomalies,
      satellite: {
        score,
        statusLabel: statusFromScore(score),
        hasCoordinates: p.locations.length > 0,
      },
    };
  });

  return {
    items: enriched,
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
