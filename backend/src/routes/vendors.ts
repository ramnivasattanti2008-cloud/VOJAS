/**
 * Vendor routes — /api/vendors
 */
import { Router } from "express";
import * as ctrl from "../controllers/vendorController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", ctrl.list);
router.get("/top", ctrl.getTop);
router.get("/:id", ctrl.getById);
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.remove);

export default router;
