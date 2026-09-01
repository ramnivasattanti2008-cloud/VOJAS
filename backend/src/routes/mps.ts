/**
 * MP routes — /api/mps
 */
import { Router } from "express";
import * as ctrl from "../controllers/mpController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

router.get("/", ctrl.list);
router.get("/:id", ctrl.getById);
router.post("/", authenticate, authorize("ADMIN", "OFFICER"), ctrl.create);
router.patch("/:id", authenticate, authorize("ADMIN", "OFFICER"), ctrl.update);
router.delete("/:id", authenticate, authorize("ADMIN"), ctrl.remove);

export default router;
