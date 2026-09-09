import { Router } from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import adminRoutes from './admin.js';
import analyticsRoutes from './analytics.js';
import anomalyRoutes from './anomalies.js';
import auditRoutes from './audit.js';
import authRoutes from './auth.js';
import changeAnalysisRoutes from './changeAnalysis.js';
import citizenReportRoutes from './citizenReports.js';
import documentRoutes from './documents.js';
import exportRoutes from './export.js';
import financialRoutes from './financial.js';
import locationRoutes from './locations.js';
import mpRoutes from './mps.js';
import notificationRoutes from './notifications.js';
import officerRoutes from './officer.js';
import projectRoutes from './projects.js';
import publicProjectsRoutes from './publicProjects.js';
import reportRoutes from './reports.js';
import reportSearchRoutes from './reportSearch.js';
import riskRoutes from './risk.js';
import satelliteRoutes from './satellite.js';
import searchRoutes from './search.js';
import sectorsRoutes from './sectors.js';
import timelineRoutes from './timeline.js';
import userRoutes from './users.js';
import vendorRoutes from './vendors.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);
// Health route (mounted at /api/v1/health for compatibility with smoke tests)
router.get('/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

// User routes
router.use('/users', userRoutes);

// M12: Public projects (no auth required) — register BEFORE /:id catch-alls
router.use('/projects/public', publicProjectsRoutes);

// Project routes
router.use('/projects', projectRoutes);

// Timeline routes
router.use('/', timelineRoutes);

// Location routes
router.use('/', locationRoutes);

// Financial routes
router.use('/', financialRoutes);

// Satellite routes
router.use('/', satelliteRoutes);

// Change analysis routes
router.use('/', changeAnalysisRoutes);

// Audit routes — requires audit.read permission
router.use('/audit', authenticate, requirePermission('audit.read'), auditRoutes);

// Anomaly routes
router.use('/anomalies', anomalyRoutes);

// M10: Citizen Reports (extended public + authenticated routes) — register BEFORE
// reportRoutes which has a `/:id` catch-all that would otherwise match /public, /nearby, /track, etc.
router.use('/reports', citizenReportRoutes);

// M10: Report search
router.use('/reports', reportSearchRoutes);

// Report routes
router.use('/reports', reportRoutes);

// Vendor routes
router.use('/vendors', vendorRoutes);

// Notification routes
router.use('/notifications', notificationRoutes);

// Document routes
router.use('/documents', documentRoutes);

// MP routes
router.use('/mps', mpRoutes);

// Risk routes (project-scoped: /projects/:id/risk; global: /summary, /findings, etc.)
router.use('/', riskRoutes);

// M13: Sector framework routes
router.use('/sectors', sectorsRoutes);

// Admin routes — requires admin.manage permission
router.use('/admin', authenticate, requirePermission('admin.manage'), adminRoutes);

// Search routes — scoped by user permissions
router.use('/search', authenticate, searchRoutes);

// M18: Export routes (CSV download) — requires admin.manage
router.use('/export', authenticate, requirePermission('admin.manage'), exportRoutes);

// M14: Officer Command Center routes
router.use('/officer', authenticate, officerRoutes);

// M16: Advanced Analytics routes
router.use('/analytics', authenticate, analyticsRoutes);

export default router;
