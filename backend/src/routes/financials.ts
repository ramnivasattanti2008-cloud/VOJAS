import { Router } from "express";
import { expenditureController } from "../controllers/expenditureController.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ── Per-project nested routes (must come before /:id to avoid conflict) ─────────
// Mounted at /projects/:projectId/expenditures
const projectRouter = Router({ mergeParams: true });
projectRouter.use(authenticate);
projectRouter.get("/", asyncHandler(expenditureController.list));
projectRouter.post("/", authorize("ADMIN", "OFFICER"), asyncHandler(expenditureController.create));
projectRouter.get("/financials", asyncHandler(expenditureController.projectFinancials));

// ── Per-expenditure routes (mounted at /financials) ──────────────────────────────
router.get("/stats", asyncHandler(expenditureController.schemeFinancials));
router.get("/", asyncHandler(expenditureController.list)); // GET /financials?projectId=... for listing
router.get("/:id", asyncHandler(expenditureController.getOne));
router.post("/", authorize("ADMIN", "OFFICER"), asyncHandler(expenditureController.create));
router.put("/:id", authorize("ADMIN", "OFFICER"), asyncHandler(expenditureController.update));
router.post("/:id/transition", authorize("ADMIN", "OFFICER"), asyncHandler(expenditureController.transition));
router.delete("/:id", authorize("ADMIN"), asyncHandler(expenditureController.remove));

export { router as financialRouter, projectRouter as projectFinancialRouter };
