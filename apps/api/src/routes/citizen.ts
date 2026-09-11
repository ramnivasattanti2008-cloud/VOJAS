/**
 * Citizen Watchlist Routes
 *
 * Lets an authenticated citizen follow / unfollow projects and list the
 * projects they currently follow. Every endpoint is scoped to the calling
 * user (req.user.userId) — a user can never read or remove another user's
 * watch entry. `updateCount` and `hasAnomalies` are derived from real
 * related records (ProjectEvent, Anomaly); nothing here is fabricated.
 */

import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { prisma } from '@vojas/db';
import { NotFoundError, ValidationError } from '@vojas/domain';
import { authenticate } from '../middleware/auth.js';
import { success, created } from '../utils/apiResponse.js';

const router = Router();

// ─── Schemas ─────────────────────────────────────────────────────────────────

const addToWatchlistSchema = z.object({
  projectId: z.string().min(1, 'projectId is required'),
});

/**
 * Response shape for a single watchlist entry. Mirrors CitizenWatchlistItem
 * in packages/api-client/src/citizen.ts — that package is a client-side
 * dependency of apps/web and is not itself a dependency of apps/api, so the
 * contract is duplicated here rather than imported.
 */
interface CitizenWatchlistItemResponse {
  id: string;
  projectId: string;
  projectName: string;
  projectSector: string;
  projectStatus: string;
  followedAt: string;
  lastChecked?: string;
  updateCount: number;
  hasAnomalies: boolean;
  district: string;
  state: string;
  approvedAmount: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const watchWithProject = {
  project: {
    select: {
      id: true,
      name: true,
      sector: true,
      status: true,
      district: true,
      state: true,
      approvedAmount: true,
      _count: {
        select: {
          projectEvents: true,
          anomalies: { where: { status: { not: 'DISMISSED' } } },
        },
      },
    },
  },
} as const;

type WatchWithProject = Awaited<ReturnType<typeof prisma.projectWatch.findFirstOrThrow<{ include: typeof watchWithProject }>>>;

function toWatchlistItem(watch: WatchWithProject): CitizenWatchlistItemResponse {
  return {
    id: watch.id,
    projectId: watch.project.id,
    projectName: watch.project.name,
    projectSector: watch.project.sector,
    projectStatus: watch.project.status,
    followedAt: watch.createdAt.toISOString(),
    lastChecked: watch.lastCheckedAt ? watch.lastCheckedAt.toISOString() : undefined,
    updateCount: watch.project._count.projectEvents,
    hasAnomalies: watch.project._count.anomalies > 0,
    district: watch.project.district,
    state: watch.project.state,
    approvedAmount: watch.project.approvedAmount,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /citizen/watchlist — the calling user's followed projects
 */
router.get('/watchlist', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;

    const watches = await prisma.projectWatch.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: watchWithProject,
    });

    success(res, watches.map(toWatchlistItem));
  } catch (err) {
    next(err);
  }
});

/**
 * POST /citizen/watchlist { projectId } — follow a project (idempotent)
 */
router.post('/watchlist', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const parsed = addToWatchlistSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ValidationError('Invalid watchlist request', parsed.error.errors);
    }
    const { projectId } = parsed.data;

    const project = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } });
    if (!project) throw new NotFoundError('Project');

    const watch = await prisma.projectWatch.upsert({
      where: { userId_projectId: { userId, projectId } },
      create: { userId, projectId },
      update: {}, // following again is a no-op — idempotent
      include: watchWithProject,
    });

    created(res, toWatchlistItem(watch));
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /citizen/watchlist/:projectId — unfollow a project.
 * Scoped to the caller: the where clause always includes userId, so this can
 * never delete another user's watch entry, regardless of what projectId is
 * supplied.
 */
router.delete('/watchlist/:projectId', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user!.userId;
    const projectId = req.params.projectId as string;

    const result = await prisma.projectWatch.deleteMany({ where: { userId, projectId } });
    if (result.count === 0) {
      throw new NotFoundError('Watchlist entry');
    }

    success(res, { success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
