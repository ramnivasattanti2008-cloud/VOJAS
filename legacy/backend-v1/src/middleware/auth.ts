import { Request, Response, NextFunction } from "express";
import { tokenService } from "../services/tokenService.js";
import { config } from "../config/index.js";

/**
 * Lightweight cookie parser — only reads the single named auth cookie.
 * Avoids pulling in `cookie-parser` as a dependency. Decodes percent-encoded
 * values for the common case (our token is JWT, which doesn't need decoding
 * beyond standard URL decoding).
 */
function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  const pairs = header.split(/;\s*/);
  for (const pair of pairs) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const k = pair.slice(0, eq).trim();
    if (k !== name) continue;
    const v = pair.slice(eq + 1).trim();
    try {
      return decodeURIComponent(v);
    } catch {
      return v;
    }
  }
  return undefined;
}

/**
 * Extract the auth token from either the Authorization header (preferred for
 * non-browser clients) or the httpOnly cookie (browser flow). Returns the
 * raw token string, or null if neither is present.
 */
function extractToken(req: Request): string | null {
  // 1. Authorization: Bearer <token> (mobile/CLI/external API)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  // 2. httpOnly cookie (browser flow — set by /auth/login)
  const cookieToken = readCookie(req, config.cookie.name);
  if (cookieToken) return cookieToken;
  return null;
}

export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "Authentication required",
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }

  try {
    const payload = tokenService.verify(token);
    (req as any).user = payload;
    next();
  } catch (err: any) {
    const message =
      !config.isProduction && err?.message
        ? `Invalid or expired token (${err.message})`
        : "Invalid or expired token";
    return res.status(401).json({
      success: false,
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message,
      },
      meta: { timestamp: new Date().toISOString() },
    });
  }
};

export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({
        success: false,
        data: null,
        error: { code: "UNAUTHORIZED", message: "Not authenticated" },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    if (!roles.includes(user.role)) {
      return res.status(403).json({
        success: false,
        data: null,
        error: { code: "FORBIDDEN", message: "Insufficient permissions" },
        meta: { timestamp: new Date().toISOString() },
      });
    }

    next();
  };
};
