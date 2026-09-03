import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { NotFoundError } from '@vojas/domain';
import { authenticate } from '../middleware/auth';
import { success } from '../utils/apiResponse';

const router = Router();

/**
 * GET /projects/:id/risk — risk summary for a project
 */
router.get(
  '/projects/:id/risk',
  authenticate,
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const projectId = req.params.id as string;
      const project = await prisma.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError('Project');

      const [risk, anomalies, reports, findings] = await Promise.all([
        prisma.projectRisk.findUnique({ where: { projectId } }),
        prisma.anomaly.count({ where: { projectId, status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
        prisma.report.count({ where: { projectId, status: { notIn: ['RESOLVED', 'DISMISSED'] } } }),
        prisma.riskFinding.count({ where: { projectId, status: { notIn: ['RESOLVED'] } } }),
      ]);

      success(res, {
        risk,
        openAnomalies: anomalies,
        openReports: reports,
        openFindings: findings,
      });
    } catch (err) {
      next(err);
    }
  }
);

/**
 * GET /risk/dashboard — global risk dashboard
 */
router.get(
  '/dashboard',
  authenticate,
  async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const [byLevel, bySeverity, recent] = await Promise.all([
        prisma.projectRisk.groupBy({
          by: ['riskLevel'],
          _count: { _all: true },
        }),
        prisma.riskFinding.groupBy({
          by: ['severity'],
          _count: { _all: true },
        }),
        prisma.projectRisk.findMany({
          orderBy: { riskScore: 'desc' },
          take: 20,
          include: {
            project: {
              select: { id: true, name: true, state: true, district: true },
            },
          },
        }),
      ]);

      success(res, { byLevel, bySeverity, topRiskProjects: recent });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
