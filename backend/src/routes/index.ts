import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import { getMetrics } from "../controllers/metricsController.js";
import { authenticate } from "../middleware/auth.js";
import authRoutes from "./auth.js";
import projectRoutes from "./projects.js";
import locationRoutes from "./locations.js";
import reportRoutes from "./reports.js";
import { financialRouter, projectFinancialRouter } from "./financials.js";
import anomalyRoutes from "./anomalies.js";
import riskRoutes from "./risk.js";
import analyticsRoutes from "./analytics.js";
import adminRoutes from "./admin.js";
import aiRoutes from "./ai.js";
import notificationRoutes from "./notifications.js";
import documentRoutes from "./documents.js";
import adminSeedRoutes from "./adminSeed.js";
import mpRoutes from "./mps.js";
import vendorRoutes from "./vendors.js";
import mpaAnalyticsRoutes from "./mpaAnalytics.js";
import geocodingRoutes from "./geocoding.js";
import satelliteRoutes from "./satellite.js";
import satelliteAiRoutes from "./satelliteAi.js";

const router = Router();

router.get("/health", getHealth);
router.get("/metrics", authenticate, getMetrics);
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/projects/:projectId/expenditures", projectFinancialRouter);
router.use("/projects/:projectId/documents", documentRoutes);
router.use("/locations", locationRoutes);
router.use("/reports", reportRoutes);
router.use("/financials", financialRouter);
router.use("/anomalies", anomalyRoutes);
router.use("/risk", riskRoutes);
router.use("/analytics", analyticsRoutes);
// Mount admin routes FIRST so auth middleware runs, THEN internal seed routes
// (seed has its own secret-token auth and must not be blocked by admin auth)
router.use("/admin", adminRoutes);
router.use("/internal", adminSeedRoutes);
router.use("/ai", aiRoutes);
router.use("/notifications", notificationRoutes);
router.use("/documents", documentRoutes);
router.use("/mps", mpRoutes);
router.use("/vendors", vendorRoutes);
router.use("/analytics", mpaAnalyticsRoutes);
router.use("/geocoding", geocodingRoutes);
router.use("/satellite", satelliteRoutes);
router.use("/satellite", satelliteAiRoutes);

export default router;
