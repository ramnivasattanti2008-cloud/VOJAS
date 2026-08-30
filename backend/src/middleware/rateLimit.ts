import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { config } from "../config/index.js";

/**
 * Rate limit for authentication endpoints.
 * Tighter limits to deter credential stuffing & brute force.
 * Skipped in test env so the test suite doesn't flake.
 */
export const authLimiter = rateLimit({
  windowMs: config.rateLimit.authWindowMs,
  max: config.rateLimit.authMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    success: false,
    data: null,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
  skip: () => config.env === "test",
});

/**
 * General API rate limit — covers all other routes.
 * 120 req/min/IP — enough for a normal SPA session, blocks naive scrapers.
 */
export const apiLimiter = rateLimit({
  windowMs: config.rateLimit.apiWindowMs,
  max: config.rateLimit.apiMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    success: false,
    data: null,
    error: {
      code: "RATE_LIMITED",
      message: "Too many requests, please try again later.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
  skip: () => config.env === "test",
});

/**
 * Tighter limit for public citizen report submissions — prevents spam floods.
 */
export const reportSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
  message: {
    success: false,
    data: null,
    error: {
      code: "RATE_LIMITED",
      message: "Too many reports submitted, please try again later.",
    },
    meta: { timestamp: new Date().toISOString() },
  },
  skip: () => config.env === "test",
});
