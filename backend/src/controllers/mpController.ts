/**
 * MP controller — list/detail/stats/create/update/delete.
 */
import { Request, Response, NextFunction } from "express";
import type { ParsedQs } from "qs";
import * as svc from "../services/mpService.js";
import { AppError } from "../middleware/errorHandler.js";

const pickString = (
  v: string | ParsedQs | (string | ParsedQs)[] | undefined,
): string | undefined => {
  if (Array.isArray(v)) {
    const first = v[0];
    if (first == null) return undefined;
    return typeof first === "string" ? first : String(first);
  }
  if (v == null) return undefined;
  return typeof v === "string" ? v : String(v);
};

export async function list(req: Request, res: Response, next: NextFunction) {
  try {
    const { house, term, state, search, page, limit } = req.query;
    const result = await svc.findAll({
      house: pickString(house) as any,
      term: pickString(term) as any,
      state: pickString(state),
      search: pickString(search),
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: result, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = pickString(req.params.id) as string;
    const mp = await svc.findById(id);
    if (!mp) throw AppError.notFound("MP not found");
    const stats = await svc.getStats(id);
    res.json({ success: true, data: { ...mp, stats }, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function create(req: Request, res: Response, next: NextFunction) {
  try {
    const mp = await svc.create(req.body);
    res.status(201).json({ success: true, data: mp, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function update(req: Request, res: Response, next: NextFunction) {
  try {
    const id = pickString(req.params.id) as string;
    const mp = await svc.update(id, req.body);
    res.json({ success: true, data: mp, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction) {
  try {
    const id = pickString(req.params.id) as string;
    await svc.remove(id);
    res.json({ success: true, data: { id }, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getProjects(req: Request, res: Response, next: NextFunction) {
  try {
    const id = pickString(req.params.id) as string;
    const page = req.query.page ? Number(req.query.page) : 1;
    const limit = Math.min(100, req.query.limit ? Number(req.query.limit) : 20);
    const result = await svc.getProjects(id, page, limit);
    res.json({ success: true, data: result, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}
