import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  analyzeReport,
  analyzePatterns,
  explainAnomaly,
  analyzeDocument,
} from "../controllers/aiController.js";

const router = Router();

/**
 * AI Analysis endpoints
 * All authenticated endpoints require at least VIEWER role (citizen report analysis is open)
 */

// Public — analyze a report text (no auth needed; used by citizens before submitting)
router.post("/analyze-report", analyzeReport);

// Public — analyze extracted document text
router.post("/analyze-document", analyzeDocument);

// Authenticated — pattern analysis on project data
router.post("/analyze-patterns", authenticate, analyzePatterns);

// Authenticated — generate AI explanation for an anomaly
router.post("/explain-anomaly", authenticate, explainAnomaly);

export default router;
