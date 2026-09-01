/**
 * Extended analytics controller — MP, Vendor, Longitudinal, Geocoding.
 * Kept in a separate file from `analyticsController` to avoid touching the
 * existing routes used by the Analytics page.
 */
import { Request, Response, NextFunction } from "express";
import type { ParsedQs } from "qs";
import {
  mpAnalyticsService,
  vendorAnalyticsService,
  longitudinalService,
} from "../services/mpaAnalyticsService.js";
import { geocodingService } from "../services/geocodingService.js";
import { AppError } from "../middleware/errorHandler.js";

const str = (v: string | ParsedQs | (string | ParsedQs)[] | undefined): string | undefined => {
  if (Array.isArray(v)) {
    const first = v[0];
    return first == null ? undefined : typeof first === "string" ? first : String(first);
  }
  return v == null ? undefined : typeof v === "string" ? v : String(v);
};

const num = (v: string | ParsedQs | (string | ParsedQs)[] | undefined): number | undefined => {
  const s = str(v);
  return s == null ? undefined : Number(s);
};

const ts = () => new Date().toISOString();
const ok = (data: unknown) => ({
  success: true,
  data,
  error: null,
  meta: { timestamp: ts() },
});

export const mpaController = {
  // GET /analytics/mp-summary
  async mpSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await mpAnalyticsService.getMPOverview();
      res.json(ok(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/mp/:id/trends
  async mpTrends(req: Request, res: Response, next: NextFunction) {
    try {
      const id = str(req.params.id) as string;
      if (!id) throw AppError.badRequest("MP ID is required");
      const data = await mpAnalyticsService.getMPTrends(id);
      res.json(ok(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/vendor-summary
  async vendorSummary(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await vendorAnalyticsService.getVendorOverview();
      res.json(ok(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/vendor-top
  async vendorTop(req: Request, res: Response, next: NextFunction) {
    try {
      const limit = num(req.query.limit) ?? 50;
      const data = await vendorAnalyticsService.getTopVendorsBenchmark(limit);
      res.json(ok(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /analytics/longitudinal
  async longitudinal(_req: Request, res: Response, next: NextFunction) {
    try {
      const data = await longitudinalService.getOverview();
      res.json(ok(data));
    } catch (err) {
      next(err);
    }
  },

  // GET /geocoding/lookup?state=&district=
  async geocode(req: Request, res: Response, next: NextFunction) {
    try {
      const state = str(req.query.state);
      const district = str(req.query.district);
      if (!state || !district) {
        throw AppError.badRequest("state and district query params are required");
      }
      const result = await geocodingService.lookup(state, district);
      res.json(ok(result));
    } catch (err) {
      next(err);
    }
  },

  // POST /geocoding/backfill
  async geocodeBackfill(req: Request, res: Response, next: NextFunction) {
    try {
      const { dryRun, limit } = (req.body ?? {}) as { dryRun?: boolean; limit?: number };
      const stats = await geocodingService.backfillProjects({ dryRun, limit });
      res.json(ok(stats));
    } catch (err) {
      next(err);
    }
  },

  // GET /geocoding/stats
  async geocodeStats(_req: Request, res: Response, next: NextFunction) {
    try {
      res.json(ok(geocodingService.cacheStats()));
    } catch (err) {
      next(err);
    }
  },
};
