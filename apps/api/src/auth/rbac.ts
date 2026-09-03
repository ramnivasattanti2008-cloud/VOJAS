import { UserRole } from '@vojas/shared';
import type { Request, Response, NextFunction } from 'express';
import { UnauthorizedError, ForbiddenError } from '@vojas/domain';

// Permission constants
export const Permissions = {
  PROJECT_READ: 'PROJECT_READ',
  PROJECT_WRITE: 'PROJECT_WRITE',
  PROJECT_DELETE: 'PROJECT_DELETE',
  ANOMALY_READ: 'ANOMALY_READ',
  ANOMALY_WRITE: 'ANOMALY_WRITE',
  ANOMALY_ACKNOWLEDGE: 'ANOMALY_ACKNOWLEDGE',
  ANOMALY_RESOLVE: 'ANOMALY_RESOLVE',
  ANOMALY_ESCALATE: 'ANOMALY_ESCALATE',
  REPORT_READ: 'REPORT_READ',
  REPORT_WRITE: 'REPORT_WRITE',
  REPORT_RESOLVE: 'REPORT_RESOLVE',
  DOCUMENT_READ: 'DOCUMENT_READ',
  DOCUMENT_UPLOAD: 'DOCUMENT_UPLOAD',
  DOCUMENT_VERIFY: 'DOCUMENT_VERIFY',
  SATELLITE_READ: 'SATELLITE_READ',
  SATELLITE_ANALYZE: 'SATELLITE_ANALYZE',
  USER_READ: 'USER_READ',
  USER_WRITE: 'USER_WRITE',
  USER_DELETE: 'USER_DELETE',
  AUDIT_READ: 'AUDIT_READ',
  FINANCIAL_READ: 'FINANCIAL_READ',
  FINANCIAL_WRITE: 'FINANCIAL_WRITE',
  VERIFICATION_READ: 'VERIFICATION_READ',
  VERIFICATION_WRITE: 'VERIFICATION_WRITE',
  ROLE_ASSIGN: 'ROLE_ASSIGN',
  SYSTEM_CONFIG: 'SYSTEM_CONFIG',
} as const;

type Permission = typeof Permissions[keyof typeof Permissions];

// Role → Permission matrix
const rolePermissions: Record<UserRole, Permission[]> = {
  [UserRole.ADMIN]: Object.values(Permissions), // all permissions
  [UserRole.OFFICER]: [
    Permissions.PROJECT_READ, Permissions.PROJECT_WRITE,
    Permissions.ANOMALY_READ, Permissions.ANOMALY_WRITE, Permissions.ANOMALY_ACKNOWLEDGE, Permissions.ANOMALY_RESOLVE, Permissions.ANOMALY_ESCALATE,
    Permissions.REPORT_READ, Permissions.REPORT_WRITE, Permissions.REPORT_RESOLVE,
    Permissions.DOCUMENT_READ, Permissions.DOCUMENT_UPLOAD, Permissions.DOCUMENT_VERIFY,
    Permissions.SATELLITE_READ,
    Permissions.FINANCIAL_READ, Permissions.FINANCIAL_WRITE,
    Permissions.VERIFICATION_READ, Permissions.VERIFICATION_WRITE,
    Permissions.AUDIT_READ,
  ],
  [UserRole.ANALYST]: [
    Permissions.PROJECT_READ,
    Permissions.ANOMALY_READ, Permissions.ANOMALY_ACKNOWLEDGE,
    Permissions.REPORT_READ,
    Permissions.DOCUMENT_READ,
    Permissions.SATELLITE_READ, Permissions.SATELLITE_ANALYZE,
    Permissions.FINANCIAL_READ,
    Permissions.VERIFICATION_READ,
    Permissions.AUDIT_READ,
  ],
  [UserRole.REVIEWER]: [
    Permissions.PROJECT_READ,
    Permissions.ANOMALY_READ, Permissions.ANOMALY_RESOLVE,
    Permissions.REPORT_READ,
    Permissions.DOCUMENT_READ,
    Permissions.SATELLITE_READ,
    Permissions.FINANCIAL_READ,
    Permissions.VERIFICATION_READ,
    Permissions.AUDIT_READ,
  ],
  [UserRole.MP]: [
    Permissions.PROJECT_READ,
    Permissions.REPORT_WRITE,
    Permissions.FINANCIAL_READ,
  ],
  [UserRole.CONTRACTOR]: [
    Permissions.PROJECT_READ,
    Permissions.DOCUMENT_UPLOAD,
    Permissions.SATELLITE_READ,
  ],
  [UserRole.CITIZEN]: [
    Permissions.PROJECT_READ,
    Permissions.REPORT_WRITE,
  ],
  [UserRole.FIELD_OFFICER]: [
    Permissions.PROJECT_READ,
    Permissions.VERIFICATION_WRITE,
  ],
  [UserRole.VIEWER]: [
    Permissions.PROJECT_READ,
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return rolePermissions[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Express middleware
export function requirePermission(...permissions: Permission[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (!hasAnyPermission(user.role, permissions)) {
      return next(new ForbiddenError(`Requires one of: ${permissions.join(', ')}`));
    }
    next();
  };
}

export function requireRole(...roles: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) return next(new UnauthorizedError('Authentication required'));
    if (!roles.includes(user.role)) {
      return next(new ForbiddenError(`Requires role: ${roles.join(' or ')}`));
    }
    next();
  };
}
