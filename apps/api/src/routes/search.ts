/**
 * General Search Routes — M18 Platform Intelligence
 *
 * Unified search across projects, reports, vendors, MPs, and anomalies.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { ValidationError } from '@vojas/domain';
import { UserRole } from '@vojas/shared';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';

const router = Router();

/**
 * GET /search — unified search across all entities
 *
 * Query params:
 *   q          — search term
 *   type       — entity type: projects | reports | vendors | mps | anomalies | all
 *   state      — filter by state
 *   district   — filter by district
 *   sector     — filter by sector
 *   page       — page number
 *   limit      — results per page
 */
router.get('/', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      q: z.string().min(1).max(200),
      type: z.enum(['projects', 'reports', 'vendors', 'mps', 'anomalies', 'all']).default('all'),
      state: z.string().optional(),
      district: z.string().optional(),
      sector: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid search parameters', parsed.error.errors);
    }

    const { q, type, state, district, sector, page, limit } = parsed.data;
    const searchTerm = { contains: q, mode: 'insensitive' as const };
    const skip = (page - 1) * limit;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results: Record<string, any> = {};

    const user = (req as any).user;
    const isPrivileged = [UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST, UserRole.REVIEWER].includes(user?.role);

    if (type === 'projects' || type === 'all') {
      const projectWhere: Record<string, unknown> = {
        OR: [
          { name: searchTerm },
          { description: searchTerm },
          { status: searchTerm },
        ],
      };
      if (state) projectWhere.state = state;
      if (district) projectWhere.district = district;
      if (sector) projectWhere.sector = sector;

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where: projectWhere,
          select: { id: true, name: true, state: true, district: true, sector: true, status: true, _count: { select: { reports: true, anomalies: true } } },
          skip, take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.project.count({ where: projectWhere }),
      ]);
      results.projects = { data: projects, total };
    }

    if (type === 'reports' || type === 'all') {
      const reportWhere: Record<string, unknown> = {
        OR: [
          { title: searchTerm },
          { description: searchTerm },
        ],
      };
      if (!isPrivileged) {
        reportWhere.privacyLevel = 'PUBLIC';
      }
      if (state || district) {
        reportWhere.project = {};
        if (state) (reportWhere.project as Record<string, unknown>).state = state;
        if (district) (reportWhere.project as Record<string, unknown>).district = district;
      }

      const [reports, total] = await Promise.all([
        prisma.report.findMany({
          where: reportWhere,
          select: { id: true, title: true, status: true, category: true, projectId: true, createdAt: true },
          skip, take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.report.count({ where: reportWhere }),
      ]);
      results.reports = { data: reports, total };
    }

    if (type === 'vendors' || type === 'all') {
      const [vendors, total] = await Promise.all([
        prisma.vendor.findMany({
          where: {
            OR: [
              { name: searchTerm },
              { contactEmail: searchTerm },
            ],
          },
          select: { id: true, name: true, contactEmail: true, totalValue: true },
          skip, take: limit,
          orderBy: { updatedAt: 'desc' },
        }),
        prisma.vendor.count({
          where: {
            OR: [{ name: searchTerm }, { contactEmail: searchTerm }],
          },
        }),
      ]);
      results.vendors = { data: vendors, total };
    }

    if (type === 'mps' || type === 'all') {
      const [mps, total] = await Promise.all([
        prisma.mP.findMany({
          where: {
            OR: [
              { name: searchTerm },
              { constituency: searchTerm },
              { party: searchTerm },
            ],
          },
          select: { id: true, name: true, constituency: true, party: true, state: true },
          skip, take: limit,
          orderBy: { name: 'asc' },
        }),
        prisma.mP.count({
          where: {
            OR: [{ name: searchTerm }, { constituency: searchTerm }, { party: searchTerm }],
          },
        }),
      ]);
      results.mps = { data: mps, total };
    }

    if (type === 'anomalies' || type === 'all') {
      const anomalyWhere: Record<string, unknown> = {
        OR: [
          { title: searchTerm },
          { description: searchTerm },
          { ruleCode: searchTerm },
        ],
      };
      if (state || district) {
        anomalyWhere.project = {};
        if (state) (anomalyWhere.project as Record<string, unknown>).state = state;
        if (district) (anomalyWhere.project as Record<string, unknown>).district = district;
      }

      const [anomalies, total] = await Promise.all([
        prisma.anomaly.findMany({
          where: anomalyWhere,
          select: { id: true, title: true, severity: true, status: true, ruleCode: true, projectId: true, createdAt: true },
          skip, take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        prisma.anomaly.count({ where: anomalyWhere }),
      ]);
      results.anomalies = { data: anomalies, total };
    }

    success(res, {
      query: q,
      type,
      page,
      limit,
      results,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
