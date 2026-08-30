import sys

content = r'''import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { documentService } from "../services/documentService.js";
import { verifyMagicBytes, getDocumentUpload } from "../utils/storage.js";
import { successResponse, errorResponse } from "../utils/response.js";
import { logger } from "../utils/logger.js";
import type { DocumentType, VerificationStatus } from "@prisma/client";
import fs from "fs";

export type { DocumentType, VerificationStatus } from "@prisma/client";

const IdParam = z.object({ id: z.string().uuid() });

const ListQuery = z.object({
  projectId: z.string().uuid().optional(),
  type: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const CreateBody = z.object({
  type: z.enum(["SANCTION_ORDER","TENDER","CONTRACT","WORK_ORDER","INVOICE","RECEIPT","COMPLETION_CERT","INSPECTION_REPORT","PHOTOGRAPH","ENVIRONMENTAL_CLEARANCE","OTHER"]),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
});

const UpdateBody = z.object({
  type: z.enum(["SANCTION_ORDER","TENDER","CONTRACT","WORK_ORDER","INVOICE","RECEIPT","COMPLETION_CERT","INSPECTION_REPORT","PHOTOGRAPH","ENVIRONMENTAL_CLEARANCE","OTHER"]).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).optional().nullable(),
});

const VerifyBody = z.object({
  status: z.enum(["VERIFIED","REJECTED","REQUIRES_INFO"]),
  verificationNote: z.string().max(500).optional().nullable(),
});

const upload = getDocumentUpload();

function requireAuth(req: Request, res: Response): string | null {
  const userId = (req as any).user?.userId;
  if (!userId) { res.status(401).json(errorResponse("UNAUTHORIZED","Authentication required")); return null; }
  return userId;
}

function requireRole(req: Request, res: Response, allowed: string[]): boolean {
  const role = (req as any).user?.role;
  if (!allowed.includes(role)) { res.status(403).json(errorResponse("FORBIDDEN","Insufficient permissions")); return false; }
  return true;
}

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = ListQuery.safeParse(req.query);
    if (!parsed.success) return res.status(400).json(errorResponse("BAD_REQUEST", parsed.error.message));
    const { projectId, type, status, search, page, limit } = parsed.data;
    const result = await documentService.list({ projectId, type: type as any, status: status as any, search, page, limit });
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

export async function stats(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireAuth(req, res); if (!userId) return;
    const projectId = typeof req.query.projectId === "string" ? req.query.projectId : undefined;
    const result = await documentService.getStats(projectId);
    res.json(successResponse(result));
  } catch (err) { next(err); }
}

export async function getOne(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireAuth(req, res); if (!userId) return;
    const doc = await documentService.getById(req.params.id);
    if (!doc) return res.status(404).json(errorResponse("NOT_FOUND","Document not found"));
    res.json(successResponse(doc));
  } catch (err) { next(err); }
}

export async function upload(req: Request, res: Response, next: NextFunction) {
  const userId = requireAuth(req, res); if (!userId) return;
  if (!requireRole(req, res, ["ADMIN","OFFICER","ANALYST","REVIEWER"])) return;

  upload.single("file")(req as any, res as any, async (err: any) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") return res.status(400).json(errorResponse("FILE_TOO_LARGE","File too large (max 25MB)"));
      return res.status(400).json(errorResponse("BAD_REQUEST", err.message ?? "Upload failed"));
    }
    const file = (req as any).file;
    if (!file) return res.status(400).json(errorResponse("BAD_REQUEST","No file uploaded"));

    const body = CreateBody.safeParse({ type: req.body.type, title: req.body.title, description: req.body.description });
    if (!body.success) { try { fs.unlinkSync(file.path); } catch {} return res.status(400).json(errorResponse("BAD_REQUEST", body.error.message)); }

    if (!verifyMagicBytes(file.path, file.mimetype)) { try { fs.unlinkSync(file.path); } catch {} return res.status(400).json(errorResponse("VALIDATION_ERROR","File content does not match its declared type")); }

    const projectId = req.body.projectId;
    if (!projectId) { try { fs.unlinkSync(file.path); } catch {} return res.status(400).json(errorResponse("BAD_REQUEST","projectId is required")); }

    try {
      const doc = await documentService.create({ projectId, type: body.data.type, title: body.data.title, description: body.data.description, filename: file.filename, originalName: file.originalname, mimeType: file.mimetype, size: file.size, uploadedById: userId });
      logger.info(`[document] Uploaded: ${doc.title} by user ${userId}`);
      res.status(201).json(successResponse(doc));
    } catch (e) { logger.error("[document] Upload failed:", e); try { fs.unlinkSync(file.path); } catch {} res.status(500).json(errorResponse("INTERNAL_ERROR","Failed to save document record")); }
  });
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireAuth(req, res); if (!userId) return;
    const params = IdParam.safeParse(req.params);
    if (!params.success) return res.status(400).json(errorResponse("BAD_REQUEST","Invalid id"));
    const body = UpdateBody.safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("BAD_REQUEST", body.error.message));
    const doc = await documentService.update(params.data.id, body.data as any);
    res.json(successResponse(doc));
  } catch (err) { next(err); }
}

export async function verify(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireAuth(req, res); if (!userId) return;
    if (!requireRole(req, res, ["ADMIN","OFFICER","REVIEWER"])) return;
    const params = IdParam.safeParse(req.params);
    if (!params.success) return res.status(400).json(errorResponse("BAD_REQUEST","Invalid id"));
    const body = VerifyBody.safeParse(req.body);
    if (!body.success) return res.status(400).json(errorResponse("BAD_REQUEST", body.error.message));
    const doc = await documentService.setVerification(params.data.id, { status: body.data.status, verifiedById: userId, verificationNote: body.data.verificationNote });
    logger.info(`[document] Verified: ${(doc as any).title} -> ${body.data.status} by user ${userId}`);
    res.json(successResponse(doc));
  } catch (err) { next(err); }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = requireAuth(req, res); if (!userId) return;
    if (!requireRole(req, res, ["ADMIN"])) return;
    const params = IdParam.safeParse(req.params);
    if (!params.success) return res.status(400).json(errorResponse("BAD_REQUEST","Invalid id"));
    const existing = await documentService.getById(params.data.id);
    if (!existing) return res.status(404).json(errorResponse("NOT_FOUND","Document not found"));
    try { fs.unlinkSync(`uploads/projects/${existing.filename}`); } catch {}
    await documentService.remove(params.data.id);
    logger.info(`[document] Deleted: ${(existing as any).title} by user ${userId}`);
    res.json(successResponse({ id: params.data.id, deleted: true }));
  } catch (err) { next(err); }
}

export const documentController = { list, stats, getOne, upload, update, verify, remove };
'''

with open('C:/Users/Ram Nivas/Documents/VOJAS/backend/src/controllers/documentController.ts', 'w', encoding='utf-8') as f:
    f.write(content)
print('controller written')
