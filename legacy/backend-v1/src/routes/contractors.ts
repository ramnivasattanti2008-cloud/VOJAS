/**
 * Contractors Router — Phase 27-35: Contractor Portal
 */
import { Router } from "express";
import { contractorService } from "../services/contractorService.js";
import { authenticate, authorize } from "../middleware/auth.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

const router = Router();

// Dashboard
router.get("/dashboard", authenticate, authorize("ADMIN", "CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const dashboard = await contractorService.getDashboard(user.userId);
  res.json({ success: true, data: dashboard });
}));

// Profile
router.get("/profile", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const profile = await contractorService.getOrCreateProfile(user.userId);
  res.json({ success: true, data: profile });
}));

router.put("/profile", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const profile = await contractorService.updateProfile(user.userId, req.body);
  res.json({ success: true, data: profile });
}));

// Milestones
router.post("/milestones", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const { contractorProjectId, title, description, dueDate, amount } = req.body;
  const milestone = await contractorService.createMilestone(contractorProjectId, { title, description, dueDate: dueDate ? new Date(dueDate) : undefined, amount });
  res.status(201).json({ success: true, data: milestone });
}));

router.post("/milestones/:id/complete", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const milestone = await contractorService.completeMilestone(req.params.id as string, new Date());
  res.json({ success: true, data: milestone });
}));

router.get("/milestones/:id", authenticate, authorize("CONTRACTOR", "ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const milestone = await contractorService.getMilestoneStatus(String(req.params.id));
  res.json({ success: true, data: milestone });
}));

// Work Diary
router.post("/work-diary", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const diary = await contractorService.createWorkDiary(req.body.contractorProjectId, {
    ...req.body,
    date: new Date(req.body.date),
  });
  res.status(201).json({ success: true, data: diary });
}));

router.get("/work-diary/:contractorProjectId", authenticate, authorize("CONTRACTOR", "ADMIN"), asyncHandler(async (req, res) => {
  const diaries = await contractorService.getWorkDiaries(String(req.params.contractorProjectId));
  res.json({ success: true, data: diaries });
}));

// Defects
router.post("/defects", authenticate, authorize("CONTRACTOR", "ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const defect = await contractorService.createDefect(req.body.contractorProjectId, req.body);
  res.status(201).json({ success: true, data: defect });
}));

router.post("/defects/:id/respond", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const defect = await contractorService.respondToDefect(req.params.id as string, req.body.response);
  res.json({ success: true, data: defect });
}));

router.post("/defects/:id/close", authenticate, authorize("ADMIN", "OFFICER"), asyncHandler(async (req, res) => {
  const defect = await contractorService.closeDefect(req.params.id as string);
  res.json({ success: true, data: defect });
}));

// Payments
router.post("/payments", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const payment = await contractorService.submitPayment(req.body.contractorProjectId, req.body);
  res.status(201).json({ success: true, data: payment });
}));

router.get("/payments/:id", authenticate, authorize("CONTRACTOR", "ADMIN"), asyncHandler(async (req, res) => {
  const payment = await contractorService.getPaymentStatus(req.params.id as string);
  res.json({ success: true, data: payment });
}));

// Responses
router.post("/responses", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const response = await contractorService.submitResponse(user.userId, req.body);
  res.status(201).json({ success: true, data: response });
}));

// Documents
router.post("/documents", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const doc = await contractorService.uploadDocument(user.userId, req.body);
  res.status(201).json({ success: true, data: doc });
}));

router.get("/documents", authenticate, authorize("CONTRACTOR"), asyncHandler(async (req, res) => {
  const user = (req as any).user;
  const docs = await contractorService.getMyDocuments(user.userId);
  res.json({ success: true, data: docs });
}));

export default router;
