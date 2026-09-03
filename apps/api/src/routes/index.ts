import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import projectRoutes from './projects';
import timelineRoutes from './timeline';
import locationRoutes from './locations';
import financialRoutes from './financial';
import satelliteRoutes from './satellite';
import auditRoutes from './audit';
import anomalyRoutes from './anomalies';
import reportRoutes from './reports';
import vendorRoutes from './vendors';
import notificationRoutes from './notifications';
import documentRoutes from './documents';
import mpRoutes from './mps';
import riskRoutes from './risk';

const router = Router();

// Auth routes
router.use('/auth', authRoutes);

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

// Audit routes
router.use('/audit', auditRoutes);

// Anomaly routes
router.use('/anomalies', anomalyRoutes);

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

// Risk routes
router.use('/risk', riskRoutes);

export default router;
