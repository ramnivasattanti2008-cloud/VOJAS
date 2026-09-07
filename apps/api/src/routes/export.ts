import { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { authenticate } from '../middleware/auth.js';
import { sendCsv } from '../services/exportService.js';

const router = Router();

// ── Helpers ────────────────────────────────────────────────────────────────────

function dateStr(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().split('T')[0];
}

function dateTimeStr(d: Date | null | undefined): string {
  if (!d) return '';
  return new Date(d).toISOString().replace('T', ' ').split('.')[0];
}

function toCsv<T extends Record<string, unknown>>(rows: T[]): string {
  if (rows.length === 0) return '';
  const columns = Object.keys(rows[0]);
  const header = columns.map(escapeCsv).join(',');
  const body = rows.map(row => columns.map(col => escapeCsv(row[col])).join(',')).join('\n');
  return `${header}\n${body}`;
}

function escapeCsv(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// ── GET /export/projects ────────────────────────────────────────────────────────

router.get('/projects', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;
    const state = req.query.state as string | undefined;
    const sector = req.query.sector as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (state) where.state = state;
    if (sector) where.sector = sector;
    if (status) where.status = status;

    const projects = await prisma.project.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        description: true,
        state: true,
        district: true,
        constituency: true,
        sector: true,
        status: true,
        approvedAmount: true,
        spentAmount: true,
        contractor: true,
        startDate: true,
        expectedEndDate: true,
        completedAt: true,
        createdAt: true,
      },
    });

    const rows = projects.map(p => ({
      'Project ID': p.id,
      'Project Name': p.name,
      'Description': p.description ?? '',
      'State': p.state ?? '',
      'District': p.district ?? '',
      'Constituency': p.constituency ?? '',
      'Sector': p.sector ?? '',
      'Status': p.status ?? '',
      'Approved Amount (INR)': Number(p.approvedAmount) || 0,
      'Spent Amount (INR)': Number(p.spentAmount) || 0,
      'Contractor': p.contractor ?? '',
      'Start Date': dateStr(p.startDate),
      'Expected End Date': dateStr(p.expectedEndDate),
      'Completed At': dateStr(p.completedAt),
      'Created At': dateTimeStr(p.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-projects-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

// ── GET /export/reports ────────────────────────────────────────────────────────

router.get('/reports', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const reports = await prisma.report.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        reportReference: true,
        title: true,
        description: true,
        category: true,
        severity: true,
        status: true,
        privacyLevel: true,
        isAnonymous: true,
        reporterName: true,
        reporterEmail: true,
        incidentDate: true,
        triageStatus: true,
        createdAt: true,
      },
    });

    const rows = reports.map(r => ({
      'Report ID': r.id,
      'Reference': r.reportReference,
      'Title': r.title,
      'Description': r.description,
      'Category': r.category ?? '',
      'Severity': r.severity ?? '',
      'Status': r.status ?? '',
      'Privacy': r.privacyLevel ?? '',
      'Anonymous': r.isAnonymous ? 'Yes' : 'No',
      'Reporter Name': r.isAnonymous ? '(anonymous)' : (r.reporterName ?? ''),
      'Reporter Email': r.isAnonymous ? '' : (r.reporterEmail ?? ''),
      'Incident Date': dateStr(r.incidentDate),
      'Triage Status': r.triageStatus ?? '',
      'Submitted At': dateTimeStr(r.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-reports-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

// ── GET /export/anomalies ─────────────────────────────────────────────────────

router.get('/anomalies', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;
    const severity = req.query.severity as string | undefined;
    const status = req.query.status as string | undefined;

    const where: Record<string, unknown> = {};
    if (severity) where.severity = severity;
    if (status) where.status = status;

    const anomalies = await prisma.anomaly.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      include: {
        project: { select: { id: true, name: true } },
      },
    });

    const rows = anomalies.map(a => ({
      'Anomaly ID': a.id,
      'Title': a.title,
      'Category': a.category ?? '',
      'Severity': a.severity ?? '',
      'Status': a.status ?? '',
      'Description': a.description ?? '',
      'Project': a.project?.name ?? '',
      'Project ID': a.projectId ?? '',
      'Rule Code': a.ruleCode ?? '',
      'Risk Score': a.riskScore ?? 0,
      'AI Confidence (%)': a.aiConfidence ?? 0,
      'AI Explanation': a.aiExplanation ?? '',
      'Law Escalated': a.lawEscalation ? 'Yes' : 'No',
      'Law Authority': a.lawAuthority ?? '',
      'Created At': dateTimeStr(a.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-anomalies-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

// ── GET /export/vendors ────────────────────────────────────────────────────────

router.get('/vendors', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;

    const vendors = await prisma.vendor.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        udyamRegNo: true,
        pan: true,
        gstin: true,
        district: true,
        state: true,
        totalContracts: true,
        totalValue: true,
        contactEmail: true,
        contactPhone: true,
        status: true,
        flagged: true,
        riskScore: true,
        createdAt: true,
      },
    });

    const rows = vendors.map(v => ({
      'Vendor ID': v.id,
      'Name': v.name,
      'Udhyam Reg No': v.udyamRegNo ?? '',
      'PAN': v.pan ?? '',
      'GSTIN': v.gstin ?? '',
      'District': v.district ?? '',
      'State': v.state ?? '',
      'Total Contracts': v.totalContracts,
      'Total Value (INR)': Number(v.totalValue) || 0,
      'Contact Email': v.contactEmail ?? '',
      'Contact Phone': v.contactPhone ?? '',
      'Status': v.status ?? '',
      'Flagged': v.flagged ? 'Yes' : 'No',
      'Risk Score': v.riskScore,
      'Created At': dateTimeStr(v.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-vendors-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

// ── GET /export/notifications ─────────────────────────────────────────────────

router.get('/notifications', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;
    const isRead = req.query.isRead as string | undefined;

    const where: Record<string, unknown> = {};
    if (isRead === 'true') where.isRead = true;
    else if (isRead === 'false') where.isRead = false;

    const notifications = await prisma.notification.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        title: true,
        message: true,
        resource: true,
        resourceId: true,
        isRead: true,
        readAt: true,
        createdAt: true,
        userId: true,
      },
    });

    const rows = notifications.map(n => ({
      'Notification ID': n.id,
      'User ID': n.userId,
      'Type': n.type ?? '',
      'Title': n.title ?? '',
      'Message': n.message ?? '',
      'Resource': n.resource ?? '',
      'Resource ID': n.resourceId ?? '',
      'Read': n.isRead ? 'Yes' : 'No',
      'Read At': dateTimeStr(n.readAt),
      'Created At': dateTimeStr(n.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-notifications-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

// ── GET /export/mps ────────────────────────────────────────────────────────────

router.get('/mps', authenticate, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 1000, 5000);
    const offset = Number(req.query.offset) || 0;

    const mps = await prisma.mP.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        house: true,
        constituency: true,
        state: true,
        term: true,
        party: true,
        lgdCode: true,
        createdAt: true,
      },
    });

    const rows = mps.map(m => ({
      'MP ID': m.id,
      'Name': m.name,
      'House': m.house ?? '',
      'Constituency': m.constituency ?? '',
      'State': m.state ?? '',
      'Term': m.term ?? '',
      'Party': m.party ?? '',
      'LGD Code': m.lgdCode ?? '',
      'Created At': dateTimeStr(m.createdAt),
    }));

    sendCsv(res, toCsv(rows), `vojas-mps-${new Date().toISOString().split('T')[0]}.csv`);
  } catch (err) {
    next(err);
  }
});

export default router;
