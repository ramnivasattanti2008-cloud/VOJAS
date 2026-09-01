/**
 * Vendor controller — list/detail/stats/top/delete.
 */
import { Request, Response, NextFunction } from "express";
import type { ParsedQs } from "qs";
import * as svc from "../services/vendorService.js";
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
    const { state, search, minPaid, page, limit, sortBy, sortDir } = req.query;
    const result = await svc.findAll({
      state: pickString(state),
      search: pickString(search),
      minPaid: minPaid ? Number(minPaid) : undefined,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      sortBy: pickString(sortBy) as any,
      sortDir: pickString(sortDir) as any,
    });
    res.json({ success: true, data: result, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction) {
  try {
    const id = pickString(req.params.id) as string;
    const vendor = await svc.findById(id);
    if (!vendor) throw AppError.notFound("Vendor not found");
    const stats = await svc.getStats(id);
    res.json({ success: true, data: { ...vendor, stats }, error: null, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    next(err);
  }
}

export async function getTop(req: Request, res: Response, next: NextFunction) {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : 20;
    const items = await svc.getTopVendors(limit);
    res.json({ success: true, data: { items }, error: null, meta: { timestamp: new Date().toISOString() } });
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
