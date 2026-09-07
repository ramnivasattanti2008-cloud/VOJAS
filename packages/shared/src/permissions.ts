/**
 * VOJAS Permissions System — M14 API Security
 *
 * Defines granular permissions for RBAC enforcement across the platform.
 * Permissions are resource.action strings (e.g., "project.read.internal").
 */

import { UserRole } from './enums';

// ── Permission Constants ─────────────────────────────────────────────────────

export const PERMISSIONS = {
  // Project permissions
  PROJECT_READ_PUBLIC: 'project.read.public',
  PROJECT_READ_INTERNAL: 'project.read.internal',
  PROJECT_READ_RESTRICTED: 'project.read.restricted',
  PROJECT_UPDATE: 'project.update',

  // Finding/Risk permissions
  FINDING_READ: 'finding.read',
  FINDING_REVIEW: 'finding.review',

  // Case/Verification permissions
  CASE_CREATE: 'case.create',
  CASE_ASSIGN: 'case.assign',
  CASE_VERIFY: 'case.verify',
  CASE_RESOLVE: 'case.resolve',

  // Document permissions
  DOCUMENT_READ: 'document.read',
  DOCUMENT_UPLOAD: 'document.upload',

  // Financial permissions
  FINANCIAL_READ: 'financial.read',

  // Citizen permissions
  CITIZEN_REPORT_CREATE: 'citizen.report.create',

  // Contractor permissions
  CONTRACTOR_RESPOND: 'contractor.respond',

  // Sector permissions
  SECTOR_READ: 'sector.read',
  SECTOR_CONFIGURE: 'sector.configure',

  // Command Center (M12 public transparency)
  COMMAND_CENTER_READ: 'command-center.read',

  // Audit permissions
  AUDIT_READ: 'audit.read',

  // Risk analysis
  RISK_READ: 'risk.read',
  RISK_TRIGGER: 'risk.trigger',

  // Admin permissions
  ADMIN_MANAGE: 'admin.manage',
  USER_MANAGE: 'user.manage',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

// ── Role → Permissions Matrix ─────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMIN: [
    PERMISSIONS.PROJECT_READ_PUBLIC,
    PERMISSIONS.PROJECT_READ_INTERNAL,
    PERMISSIONS.PROJECT_READ_RESTRICTED,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.FINDING_READ,
    PERMISSIONS.FINDING_REVIEW,
    PERMISSIONS.CASE_CREATE,
    PERMISSIONS.CASE_ASSIGN,
    PERMISSIONS.CASE_VERIFY,
    PERMISSIONS.CASE_RESOLVE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.CITIZEN_REPORT_CREATE,
    PERMISSIONS.CONTRACTOR_RESPOND,
    PERMISSIONS.SECTOR_READ,
    PERMISSIONS.SECTOR_CONFIGURE,
    PERMISSIONS.COMMAND_CENTER_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.RISK_TRIGGER,
    PERMISSIONS.ADMIN_MANAGE,
    PERMISSIONS.USER_MANAGE,
  ],
  OFFICER: [
    PERMISSIONS.PROJECT_READ_INTERNAL,
    PERMISSIONS.PROJECT_UPDATE,
    PERMISSIONS.FINDING_READ,
    PERMISSIONS.FINDING_REVIEW,
    PERMISSIONS.CASE_CREATE,
    PERMISSIONS.CASE_ASSIGN,
    PERMISSIONS.CASE_VERIFY,
    PERMISSIONS.CASE_RESOLVE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.CITIZEN_REPORT_CREATE,
    PERMISSIONS.SECTOR_READ,
    PERMISSIONS.SECTOR_CONFIGURE,
    PERMISSIONS.COMMAND_CENTER_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.RISK_TRIGGER,
  ],
  MP: [
    PERMISSIONS.PROJECT_READ_PUBLIC,
    PERMISSIONS.FINDING_READ,
    PERMISSIONS.CITIZEN_REPORT_CREATE,
    PERMISSIONS.FINANCIAL_READ,
    PERMISSIONS.SECTOR_READ,
  ],
  CONTRACTOR: [
    PERMISSIONS.PROJECT_READ_PUBLIC,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
    PERMISSIONS.CONTRACTOR_RESPOND,
  ],
  CITIZEN: [
    PERMISSIONS.PROJECT_READ_PUBLIC,
    PERMISSIONS.CITIZEN_REPORT_CREATE,
  ],
  REVIEWER: [
    PERMISSIONS.PROJECT_READ_INTERNAL,
    PERMISSIONS.FINDING_READ,
    PERMISSIONS.FINDING_REVIEW,
    PERMISSIONS.CASE_VERIFY,
    PERMISSIONS.CASE_RESOLVE,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.SECTOR_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.RISK_READ,
  ],
  ANALYST: [
    PERMISSIONS.PROJECT_READ_INTERNAL,
    PERMISSIONS.FINDING_READ,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.SECTOR_READ,
    PERMISSIONS.AUDIT_READ,
    PERMISSIONS.RISK_READ,
    PERMISSIONS.RISK_TRIGGER,
  ],
  FIELD_OFFICER: [
    PERMISSIONS.PROJECT_READ_INTERNAL,
    PERMISSIONS.CASE_VERIFY,
    PERMISSIONS.DOCUMENT_READ,
    PERMISSIONS.DOCUMENT_UPLOAD,
  ],
  VIEWER: [
    PERMISSIONS.PROJECT_READ_PUBLIC,
  ],
};

/**
 * Check if a user with given permissions has the required permission.
 */
export function hasPermission(userPerms: Permission[], required: Permission): boolean {
  return userPerms.includes(required);
}

/**
 * Check if a user has ANY of the required permissions.
 */
export function hasAnyPermission(userPerms: Permission[], required: Permission[]): boolean {
  return required.some(p => userPerms.includes(p));
}

/**
 * Check if a user has ALL of the required permissions.
 */
export function hasAllPermissions(userPerms: Permission[], required: Permission[]): boolean {
  return required.every(p => userPerms.includes(p));
}

/**
 * Get permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
