import { Router } from "express";
import { adminController } from "../controllers/adminController.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

// One-shot seed endpoint, no auth (protected by a secret token in query string)
const router = Router();
router.post("/seed", asyncHandler(adminController.seed));

export default router;
