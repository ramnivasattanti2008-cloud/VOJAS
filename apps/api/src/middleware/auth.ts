import type { Request, Response, NextFunction } from 'express';
import { prisma } from '@vojas/db';
import { verifyAccessToken } from '../auth/jwt.js';
import { UnauthorizedError, ForbiddenError } from '@vojas/domain';
import type { JWTPayload } from '../auth/jwt.js';
import type {
  Permission} from '@vojas/shared';
import {
  UserRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  hasAnyPermission,
  getPermissionsForRole,
} from '@vojas/shared';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
      userPermissions?: Permission[];
    }
  }
}

export const requireAuth = authenticate;


/**
 * A correctly signed access token is not sufficient on its own.
 * POST /auth/logout deletes the session row, but nothing used to consult it, so
 * a "logged out" access token kept working until its own 15-minute expiry —
 * logout was cosmetic. Both middlewares below now confirm the session is still
 * present and unexpired before trusting the token's claims.
 */
async function sessionIsLive(sessionId: string): Promise<boolean> {
  if (!sessionId) return false;
  const session = await prisma.session.findUnique({
    where: { id: sessionId },
    select: { expiresAt: true },
  });
  return Boolean(session && session.expiresAt.getTime() > Date.now());
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  // Prefer httpOnly cookie; fall back to Authorization header (legacy/Bearer).
  const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.vojas_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken || bearerToken;
  if (!token) {
    return next(new UnauthorizedError('No authorization token provided'));
  }

  let payload: JWTPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    return next(new UnauthorizedError('Invalid or expired token'));
  }

  sessionIsLive(payload.sessionId)
    .then((live) => {
      if (!live) {
        next(new UnauthorizedError('Session is no longer valid'));
        return;
      }
      req.user = payload;
      // Compute permissions from role
      req.userPermissions = ROLE_PERMISSIONS[payload.role] ?? [];
      next();
    })
    .catch(next);
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const cookieToken = (req as unknown as { cookies?: Record<string, string> }).cookies?.vojas_token;
  const authHeader = req.headers.authorization;
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
  const token = cookieToken || bearerToken;
  if (!token) {
    next();
    return;
  }

  let payload: JWTPayload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    // An unusable token on an optional-auth route just means anonymous.
    next();
    return;
  }

  sessionIsLive(payload.sessionId)
    .then((live) => {
      if (live) {
        req.user = payload;
        req.userPermissions = ROLE_PERMISSIONS[payload.role] ?? [];
      }
      next();
    })
    .catch(() => next());
}

/**
 * Require the request to have one of the specified roles.
 * Must be used AFTER authenticate() middleware.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }
    if (!roles.includes(req.user.role)) {
      // An authenticated caller whose role is wrong is forbidden, not
      // unauthenticated. Returning 401 here told clients to re-authenticate to
      // fix a problem that re-authenticating cannot fix, and it disagreed with
      // requirePermission() one function below, which already answers 403.
      return next(new ForbiddenError(`Insufficient permissions. Required: ${roles.join(' or ')}`));
    }
    next();
  };
}

/**
 * Require the user to have a specific permission.
 * Must be used AFTER authenticate() middleware.
 * Permissions are computed from role if not explicitly set on req.userPermissions.
 */
export function requirePermission(permission: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const perms = req.userPermissions ?? getPermissionsForRole(req.user.role);
    if (!hasPermission(perms as Permission[], permission as Permission)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'Forbidden',
          message: `Permission denied. Required: ${permission}`,
          required: permission,
        },
      });
    }
    next();
  };
}

/**
 * Require the user to have ANY of the specified permissions.
 * Must be used AFTER authenticate() middleware.
 */
export function requireAnyPermission(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const perms = req.userPermissions ?? getPermissionsForRole(req.user.role);
    if (!hasAnyPermission(perms as Permission[], permissions as Permission[])) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'Forbidden',
          message: `Permission denied. Required one of: ${permissions.join(', ')}`,
          required: permissions[0],
        },
      });
    }
    next();
  };
}

/**
 * Require the user to have ALL of the specified permissions.
 */
export function requireAllPermissions(permissions: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required'));
    }

    const perms = req.userPermissions ?? getPermissionsForRole(req.user.role);
    const missing = permissions.filter(p => !(perms as Permission[]).includes(p as Permission));
    if (missing.length > 0) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'Forbidden',
          message: `Permission denied. Missing: ${missing.join(', ')}`,
          required: missing[0],
        },
      });
    }
    next();
  };
}
