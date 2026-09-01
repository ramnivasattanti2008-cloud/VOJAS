/**
 * Data Quality Service — Phase 42: Data Quality Engine
 */
import { prisma } from "../config/database.js";
import { AppError } from "../middleware/errorHandler.js";

export const dataQualityService = {
  /**
   * Scan all projects for quality issues and create records.
   */
  async scanProjects() {
    const projects = await prisma.project.findMany({
      select: { id: true, name: true, district: true, state: true, status: true },
    });

    const issues: { entity: string; entityId: string; issueType: string; description: string; severity: string }[] = [];

    for (const p of projects) {
      // Missing district/state
      if (!p.district || !p.state) {
        issues.push({ entity: "PROJECT", entityId: p.id, issueType: "MISSING_DATA", description: `Project '${p.name}' missing location info`, severity: "HIGH" });
      }

      // Missing district/state
      if (!p.district || !p.state) {
        issues.push({ entity: "PROJECT", entityId: p.id, issueType: "MISSING_DATA", description: `Project '${p.name}' missing location info`, severity: "HIGH" });
      }

      // Stale: in-progress for > 2 years
      if (p.status === "IN_PROGRESS" && p.state) {
        const twoYearsAgo = new Date();
        twoYearsAgo.setFullYear(twoYearsAgo.getFullYear() - 2);
        const updated = await prisma.project.findUnique({
          where: { id: p.id },
          select: { updatedAt: true },
        });
        if (updated && updated.updatedAt < twoYearsAgo) {
          issues.push({ entity: "PROJECT", entityId: p.id, issueType: "STALE_DATA", description: `Project '${p.name}' has not been updated in over 2 years`, severity: "LOW" });
        }
      }

      // Duplicate name detection (simple)
      const similar = projects.filter(
        (other) => other.id !== p.id && other.name && p.name &&
          other.name.toLowerCase().includes(p.name.toLowerCase().substring(0, 10))
      );
      if (similar.length > 0) {
        issues.push({ entity: "PROJECT", entityId: p.id, issueType: "DUPLICATE", description: `Project '${p.name}' may duplicate '${similar[0].name}'`, severity: "MEDIUM" });
      }
    }

    // Scan vendors
    const vendors = await prisma.vendor.findMany({ select: { id: true, name: true, nameNormalized: true } });
    const duplicateVendors = vendors.filter(
      (v, i) => vendors.findIndex((o) => o.id !== v.id && o.nameNormalized === v.nameNormalized) !== -1
    );
    for (const v of duplicateVendors) {
      issues.push({ entity: "VENDOR", entityId: v.id, issueType: "DUPLICATE", description: `Vendor '${v.name}' appears to be a duplicate`, severity: "LOW" });
    }

    // Create all issues
    const created = [];
    for (const issue of issues) {
      const existing = await prisma.dataQualityIssue.findFirst({
        where: { entity: issue.entity, entityId: issue.entityId, issueType: issue.issueType, status: { notIn: ["RESOLVED", "DISMISSED"] } },
      });
      if (!existing) {
        const created_ = await prisma.dataQualityIssue.create({ data: issue });
        created.push(created_);
      }
    }

    return { scanned: projects.length, issuesCreated: created.length, issues: created };
  },

  async list(opts?: { entity?: string; issueType?: string; status?: string; page?: number; limit?: number }) {
    const { entity, issueType, status, page = 1, limit = 50 } = opts ?? {};
    const where: Record<string, unknown> = {};
    if (entity) where.entity = entity;
    if (issueType) where.issueType = issueType;
    if (status) where.status = status;

    const [total, items] = await Promise.all([
      prisma.dataQualityIssue.count({ where }),
      prisma.dataQualityIssue.findMany({
        where,
        orderBy: [{ severity: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return { items, total: Number(total), page, limit, totalPages: Math.ceil(Number(total) / limit) };
  },

  async resolve(id: string, resolvedById: string, resolution: string) {
    return prisma.dataQualityIssue.update({
      where: { id },
      data: { status: "RESOLVED", resolvedById, resolution, resolvedAt: new Date() },
    });
  },

  async dismiss(id: string, resolvedById: string, resolution: string) {
    return prisma.dataQualityIssue.update({
      where: { id },
      data: { status: "DISMISSED", resolvedById, resolution, resolvedAt: new Date() },
    });
  },

  /**
   * Scan a specific entity type for quality issues.
   */
  async scanEntity(entityType: string) {
    const issues: any[] = [];
    // For non-PROJECT types, just do a quick count check
    if (entityType === "DEVELOPMENT_REQUEST") {
      const total = await prisma.developmentRequest.count();
      const missing = await prisma.developmentRequest.count({ where: { description: { equals: "" } } });
      if (missing > 0) issues.push({ issueType: "MISSING_DATA", entity: "DEVELOPMENT_REQUEST", description: `${missing} requests missing description`, severity: "MEDIUM", count: missing });
      return { scanned: total, issues, entityType };
    }
    if (entityType === "CASE") {
      const total = await prisma.case.count();
      return { scanned: total, issues, entityType };
    }
    if (entityType === "ASSET") {
      const total = await prisma.asset.count();
      return { scanned: total, issues, entityType };
    }
    return { scanned: 0, issues, entityType };
  },

  async getStats() {
    const [total, byType, byEntity, bySeverity, byStatus] = await Promise.all([
      prisma.dataQualityIssue.count(),
      prisma.dataQualityIssue.groupBy({ by: ["issueType"], _count: true }),
      prisma.dataQualityIssue.groupBy({ by: ["entity"], _count: true }),
      prisma.dataQualityIssue.groupBy({ by: ["severity"], _count: true }),
      prisma.dataQualityIssue.groupBy({ by: ["status"], _count: true }),
    ]);

    return {
      total,
      byType: Object.fromEntries(byType.map((r) => [r.issueType, r._count])),
      byEntity: Object.fromEntries(byEntity.map((r) => [r.entity, r._count])),
      bySeverity: Object.fromEntries(bySeverity.map((r) => [r.severity, r._count])),
      byStatus: Object.fromEntries(byStatus.map((r) => [r.status, r._count])),
    };
  },
};
