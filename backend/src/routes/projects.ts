import { Router } from "express";
import { projectController } from "../controllers/projectController.js";
import { authenticate, authorize } from "../middleware/auth.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Public listing & detail — any authenticated user
router.get("/", projectController.list);
router.get("/stats", projectController.stats);
router.get("/:id", projectController.getOne);

// Create — ADMIN and OFFICER only
router.post(
  "/",
  authorize("ADMIN", "OFFICER"),
  projectController.create
);

// Update — ADMIN and OFFICER only
router.put(
  "/:id",
  authorize("ADMIN", "OFFICER"),
  projectController.update
);

// Delete — ADMIN only
router.delete(
  "/:id",
  authorize("ADMIN"),
  projectController.remove
);

export default router;
