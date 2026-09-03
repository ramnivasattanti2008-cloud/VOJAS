import { Router } from "express";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { documentController } from "../controllers/documentController.js";

const router = Router();

// All document routes require auth
router.use(authenticate);

// GET /documents?projectId=&type=&status=&search=&page=&limit=
router.get("/", asyncHandler(documentController.list));

// GET /documents/search?q=... — global search
router.get("/search", asyncHandler(documentController.search));

// GET /documents/stats?projectId=
router.get("/stats", asyncHandler(documentController.stats));

// GET /documents/:id
router.get("/:id", asyncHandler(documentController.getOne));

// POST /documents (multipart: file, type, title, description, projectId)
router.post("/", authorize("ADMIN", "OFFICER"), asyncHandler(documentController.upload));

// PATCH /documents/:id — update metadata
router.patch("/:id", authorize("ADMIN", "OFFICER"), asyncHandler(documentController.update));

// PATCH /documents/:id/verify
router.patch("/:id/verify", authorize("ADMIN", "OFFICER"), asyncHandler(documentController.verify));

// POST /documents/:id/analyze (AI analysis)
router.post("/:id/analyze", authorize("ADMIN", "OFFICER"), asyncHandler(documentController.analyze));

// DELETE /documents/:id
router.delete("/:id", authorize("ADMIN"), asyncHandler(documentController.remove));

export default router;
