/**
 * Geocoding routes — LGD-driven coordinate lookup and backfill.
 */
import { Router } from "express";
import { mpaController } from "../controllers/mpaController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.use(authenticate);

router.get("/lookup", mpaController.geocode);
router.get("/stats", authorize("ADMIN"), mpaController.geocodeStats);
router.post("/backfill", authorize("ADMIN"), mpaController.geocodeBackfill);

export default router;
