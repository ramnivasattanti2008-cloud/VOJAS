/**
 * Report Search Routes — M10 Citizen Intelligence Report
 *
 * Advanced search across citizen reports with role-based filtering.
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
 * GET /reports/search — search reports by multiple criteria
 *
 * Query params:
 *   q             — full-text search (title + description)
 *   projectId     — filter by project
 *   category      — filter by category
 *   district      — filter by district
 *   state         — filter by state
 *   status        — filter by status
 *   privacyLevel  — filter by privacy level
 *   dateFrom      — submitted after this date
 *   dateTo        — submitted before this date
 *   triageStatus  — triage status
 *   severity      — severity level
 *   page          — page number
 *   limit         — results per page
 */
router.get('/search', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      q: z.string().optional(),
      projectId: z.string().uuid().optional(),
      category: z.string().optional(),
      district: z.string().optional(),
      state: z.string().optional(),
      status: z.string().optional(),
      privacyLevel: z.string().optional(),
      dateFrom: z.string().datetime().optional(),
      dateTo: z.string().datetime().optional(),
      triageStatus: z.string().optional(),
      severity: z.string().optional(),
      page: z.coerce.number().int().min(1).default(1),
      limit: z.coerce.number().int().min(1).max(100).default(20),
      sortBy: z.enum(['createdAt', 'updatedAt', 'submittedAt', 'severity']).optional(),
      sortOrder: z.enum(['asc', 'desc']).default('desc'),
    });

    const parsed = schema.safeParse(req.query);
    if (!parsed.success) {
      throw new ValidationError('Invalid search parameters', parsed.error.errors);
    }

    const p = parsed.data;
    const user = (req as any).user;

    // Role-based privacy filtering
    const isPrivileged = [UserRole.ADMIN, UserRole.OFFICER, UserRole.ANALYST, UserRole.REVIEWER].includes(user?.role);
    const isCitizen = user?.role === UserRole.CITIZEN || user?.role === UserRole.MP;
    const isContractor = user?.role === UserRole.CONTRACTOR;

    // Build WHERE clause
    const where: Record<string, unknown> = {};

    // Privacy scoping
    if (!isPrivileged) {
      if (isCitizen || isContractor) {
        // Citizens/contractors can see: their own reports + public reports
        where.OR = [
          { privacyLevel: 'PUBLIC' },
          { reporterEmail: user?.email ?? '' },
        ];
      } else {
        // Unauthenticated: only public reports
        where.privacyLevel = 'PUBLIC';
      }
    }

    // Full-text search
    if (p.q) {
      const searchTerm = { contains: p.q, mode: 'insensitive' as const };
      where.AND = [
        ...(Array.isArray(where.AND) ? where.AND : []),
        {
          OR: [
            { title: searchTerm },
            { description: searchTerm },
            { reportReference: searchTerm },
            { locationDesc: searchTerm },
          ],
        },
      ];
    }

    if (p.projectId) where.projectId = p.projectId;
    if (p.category) where.category = p.category;
    if (p.status) where.status = p.status;
    if (p.privacyLevel) where.privacyLevel = p.privacyLevel;
    if (p.triageStatus) where.triageStatus = p.triageStatus;
    if (p.severity) where.severity = p.severity;

    // Date range
    if (p.dateFrom || p.dateTo) {
      where.submittedAt = {};
      if (p.dateFrom) (where.submittedAt as Record<string, unknown>).gte = new Date(p.dateFrom);
      if (p.dateTo) (where.submittedAt as Record<string, unknown>).lte = new Date(p.dateTo);
    }

    // District/state filtering via project relation
    if (p.district || p.state) {
      where.project = {};
      if (p.district) (where.project as Record<string, unknown>).district = p.district;
      if (p.state) (where.project as Record<string, unknown>).state = p.state;
    }

    // Sort
    const orderBy = p.sortBy
      ? { [p.sortBy]: p.sortOrder }
      : { submittedAt: 'desc' as const };

    const [data, total] = await prisma.$transaction([
      prisma.report.findMany({
        where,
        orderBy,
        skip: (p.page - 1) * p.limit,
        take: p.limit,
        include: {
          project: { select: { id: true, name: true, state: true, district: true, sector: true } },
          assignedTo: { select: { id: true, name: true } },
          _count: { select: { media: true, claims: true } },
        },
      }),
      prisma.report.count({ where }),
    ]);

    // Aggregate facets (counts by category/status) for faceted search UI
    const facets = await prisma.report.groupBy({
      by: ['category'],
      where,
      _count: true,
    });

    success(res, {
      data: data.map(r => ({
        ...r,
        mediaCount: r._count.media,
        claimsCount: r._count.claims,
      })),
      total,
      page: p.page,
      limit: p.limit,
      totalPages: Math.ceil(total / p.limit),
      facets: facets.map(f => ({
        category: f.category,
        count: f._count,
      })),
    });
  } catch (err) {
    next(err);
  }
});

export default router;
