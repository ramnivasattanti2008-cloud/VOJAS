/**
 * Showcase & Construction Fraud Routes — VOJAS
 *
 * Dedicated endpoints for the 13 Curated Real Showcase Projects,
 * Weekly Satellite Imagery Timeline Verification, and Contractor Submissions.
 */

import { Router, Request, Response } from 'express';
import { prisma } from '@vojas/db';
import { analyzeConstructionProject } from '../services/constructionFraudEngine.js';

export const showcaseRouter = Router();

/**
 * GET /api/v1/showcase/projects
 * Returns the 13 curated showcase projects organized by status.
 */
showcaseRouter.get('/projects', async (_req: Request, res: Response): Promise<void> => {
  try {
    const projects = await prisma.project.findMany({
      where: {
        source: 'SHOWCASE_CURATED',
      },
      include: {
        mp: true,
        anomalies: {
          where: { status: 'OPEN' },
          select: { id: true, severity: true, title: true, description: true },
        },
        _count: {
          select: { satelliteObservations: true, contractorUpdates: true },
        },
      },
      orderBy: { id: 'asc' },
    });

    // Partition into Finished, Ongoing, Stalled/Fraud
    const finished = projects.filter((p) => p.status === 'COMPLETED');
    const stalled = projects.filter((p) => p.id.includes('fraud') || p.anomalies.length > 0);
    const ongoing = projects.filter((p) => p.status === 'IN_PROGRESS' && !stalled.some((s) => s.id === p.id));

    res.json({
      success: true,
      data: {
        all: projects,
        finished,
        ongoing,
        stalled,
        counts: {
          total: projects.length,
          finished: finished.length,
          ongoing: ongoing.length,
          stalled: stalled.length,
        },
      },
    });
  } catch (err) {
    console.error('Failed to get showcase projects', err);
    res.status(500).json({ success: false, error: 'Failed to retrieve showcase projects' });
  }
});

/**
 * GET /api/v1/showcase/projects/:id/weekly-report
 * Full AI Fraud & Weekly Satellite Imagery analysis report.
 */
showcaseRouter.get('/projects/:id/weekly-report', async (req: Request, res: Response): Promise<void> => {
  try {
    const projectId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const report = await analyzeConstructionProject(projectId);
    if (!report) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }
    res.json({ success: true, data: report });
  } catch (err) {
    console.error('Failed to generate weekly satellite report', err);
    res.status(500).json({ success: false, error: 'Failed to analyze project' });
  }
});

/**
 * POST /api/v1/showcase/contractor/submit
 * Contractor progress report submission with immediate satellite cross-check.
 */
showcaseRouter.post('/contractor/submit', async (req: Request, res: Response): Promise<void> => {
  try {
    const { projectId, percentDone, percentLeft, amountSpent, milestoneNotes, sitePhotoUrl } = req.body;

    if (!projectId || percentDone == null) {
      res.status(400).json({ success: false, error: 'projectId and percentDone are required' });
      return;
    }

    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project) {
      res.status(404).json({ success: false, error: 'Project not found' });
      return;
    }

    // Find demo contractor user
    const contractorUser = await prisma.user.findFirst({ where: { role: 'CONTRACTOR' } });
    const contractorRecord = await prisma.contractor.findFirst();

    // Create ContractorUpdate
    const update = await prisma.contractorUpdate.create({
      data: {
        projectId,
        contractorId: contractorRecord?.id || 'cont-kalinga',
        updateType: 'STATUS',
        title: `Work Progress Submission (${percentDone}% Reported)`,
        description: `Contractor reported: ${percentDone}% done, ${percentLeft ?? Math.max(0, 100 - percentDone)}% left. Notes: ${milestoneNotes || 'No notes provided'}. ${sitePhotoUrl ? `Site photo: ${sitePhotoUrl}` : ''}`,
        amount: Number(amountSpent) || 0,
        status: 'PENDING',
        submittedById: contractorUser?.id || 'system',
      },
    });

    // Run AI fraud engine to verify claim against latest satellite observation
    const fraudReport = await analyzeConstructionProject(projectId);

    res.json({
      success: true,
      data: {
        submission: update,
        verificationReport: fraudReport,
      },
    });
  } catch (err) {
    console.error('Failed to submit contractor report', err);
    res.status(500).json({ success: false, error: 'Failed to process contractor update' });
  }
});
