import { Router } from "express";
import { getHealth } from "../controllers/healthController.js";
import authRoutes from "./auth.js";
import projectRoutes from "./projects.js";
import locationRoutes from "./locations.js";

const router = Router();

router.get("/health", getHealth);
router.use("/auth", authRoutes);
router.use("/projects", projectRoutes);
router.use("/locations", locationRoutes);

export default router;
