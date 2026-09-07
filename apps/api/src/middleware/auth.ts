import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../auth/jwt.js';
import { UnauthorizedError, ForbiddenError } from '@vojas/domain';
import type { JWTPayload } from '../auth/jwt.js';
import {
  UserRole,
  Permission,
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

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new UnauthorizedError('No authorization token provided'));
  }
  const token = authHeader.slice(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = payload;
    // Compute permissions from role
    req.userPermissions = ROLE_PERMISSIONS[payload.role] ?? [];
    next();
  } catch {
    next(new UnauthorizedError('Invalid or expired token'));
  }
}

export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      const payload = verifyAccessToken(token);
      req.user = payload;
      req.userPermissions = ROLE_PERMISSIONS[payload.role] ?? [];
    } catch { /* ignore invalid token for optional auth */ }
  }
  next();
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
      return next(new UnauthorizedError(`Insufficient permissions. Required: ${roles.join(' or ')}`));
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
