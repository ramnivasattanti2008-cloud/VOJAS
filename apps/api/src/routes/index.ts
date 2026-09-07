import { Router } from 'express';
import authRoutes from './auth.js';
import userRoutes from './users.js';
import projectRoutes from './projects.js';
import timelineRoutes from './timeline.js';
import locationRoutes from './locations.js';
import financialRoutes from './financial.js';
import satelliteRoutes from './satellite.js';
import changeAnalysisRoutes from './changeAnalysis.js';
import auditRoutes from './audit.js';
import anomalyRoutes from './anomalies.js';
import reportRoutes from './reports.js';
import citizenReportRoutes from './citizenReports.js';
import reportSearchRoutes from './reportSearch.js';
import publicProjectsRoutes from './publicProjects.js';
import vendorRoutes from './vendors.js';
import notificationRoutes from './notifications.js';
import documentRoutes from './documents.js';
import mpRoutes from './mps.js';
import riskRoutes from './risk.js';
import sectorsRoutes from './sectors.js';
import adminRoutes from './admin.js';
import exportRoutes from './export.js';
import searchRoutes from './search.js';
import officerRoutes from './officer.js';
import { authenticate, requirePermission } from '../middleware/auth.js';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);
// Health route (mounted at /api/v1/health for compatibility with smoke tests)
router.get('/health', (_req, res) => { res.json({ status: 'ok', timestamp: new Date().toISOString() }); });

// User routes
router.use('/users', userRoutes);

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

// Report routes
router.use('/reports', reportRoutes);

// M10: Citizen Reports (extended public + authenticated routes)
router.use('/reports', citizenReportRoutes);

// M10: Report search
router.use('/reports', reportSearchRoutes);

// M12: Public projects (no auth required)
router.use('/projects', publicProjectsRoutes);

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

export default router;
