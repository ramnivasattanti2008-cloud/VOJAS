/**
 * VOJAS RBAC — Role-Based Access Control Helpers
 *
 * Provides resource-level access checks for projects, findings, and cases.
 */

import { UserRole } from './enums.js';
import { Permission, PERMISSIONS, ROLE_PERMISSIONS, getPermissionsForRole } from './permissions.js';

// ── Types ─────────────────────────────────────────────────────────────────────

export type VisibilityScope = 'all' | 'constituency' | 'assigned' | 'public';

export interface ProjectContext {
  id: string;
  constituency?: string | null;
  assignedToId?: string | null;
  clearanceLevel?: string;
  state?: string;
  district?: string;
}

export interface FindingContext {
  id: string;
  projectId?: string;
  clearanceLevel?: string;
  status?: string;
  severity?: string;
}

export interface CaseContext {
  id: string;
  assignedToId?: string | null;
  status?: string;
  jurisdiction?: string;
}

export interface UserContext {
  userId: string;
  role: UserRole;
  constituency?: string | null;
  permissions: Permission[];
}

// ── Role Display Names ────────────────────────────────────────────────────────

export const ROLE_DISPLAY_NAMES: Record<UserRole, string> = {
  ADMIN: 'Administrator',
  OFFICER: 'Officer',
  ANALYST: 'Analyst',
  REVIEWER: 'Reviewer',
  MP: 'Member of Parliament',
  CONTRACTOR: 'Contractor',
  CITIZEN: 'Citizen',
  FIELD_OFFICER: 'Field Officer',
  VIEWER: 'Viewer',
};

export function getRoleDisplayName(role: UserRole): string {
  return ROLE_DISPLAY_NAMES[role] ?? role;
}

// ── Core Access Checks ────────────────────────────────────────────────────────

/**
 * Generic access check for a user performing an action on a resource.
 */
export function canAccess(
  user: UserContext,
  resource: 'project' | 'finding' | 'case' | 'document' | 'audit',
  action: 'read' | 'write' | 'delete' | 'manage'
): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  switch (resource) {
    case 'project':
      if (action === 'read') {
        return perms.includes(PERMISSIONS.PROJECT_READ_PUBLIC) ||
               perms.includes(PERMISSIONS.PROJECT_READ_INTERNAL) ||
               perms.includes(PERMISSIONS.PROJECT_READ_RESTRICTED);
      }
      if (action === 'write') {
        return perms.includes(PERMISSIONS.PROJECT_UPDATE);
      }
      return user.role === UserRole.ADMIN;

    case 'finding':
      if (action === 'read') {
        return perms.includes(PERMISSIONS.FINDING_READ);
      }
      if (action === 'write') {
        return perms.includes(PERMISSIONS.FINDING_REVIEW);
      }
      return user.role === UserRole.ADMIN;

    case 'case':
      if (action === 'read') {
        return perms.includes(PERMISSIONS.CASE_VERIFY);
      }
      if (action === 'write') {
        return perms.includes(PERMISSIONS.CASE_RESOLVE);
      }
      if (action === 'manage') {
        return perms.includes(PERMISSIONS.CASE_ASSIGN) || perms.includes(PERMISSIONS.CASE_CREATE);
      }
      return false;

    case 'document':
      if (action === 'read') {
        return perms.includes(PERMISSIONS.DOCUMENT_READ);
      }
      if (action === 'write') {
        return perms.includes(PERMISSIONS.DOCUMENT_UPLOAD);
      }
      return false;

    case 'audit':
      return perms.includes(PERMISSIONS.AUDIT_READ);

    default:
      return false;
  }
}

// ── Project Access ────────────────────────────────────────────────────────────

/**
 * Check if user can access a specific project.
 */
export function canAccessProject(user: UserContext, project: ProjectContext): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  // Admin can access all
  if (user.role === UserRole.ADMIN) return true;

  // Restricted projects need restricted permission
  if (project.clearanceLevel === 'RESTRICTED') {
    return perms.includes(PERMISSIONS.PROJECT_READ_RESTRICTED);
  }

  // Internal projects need internal permission
  if (project.clearanceLevel === 'INTERNAL') {
    return perms.includes(PERMISSIONS.PROJECT_READ_INTERNAL);
  }

  // MPs can access their constituency
  if (user.role === UserRole.MP && project.constituency) {
    return perms.includes(PERMISSIONS.PROJECT_READ_PUBLIC);
  }

  // Public projects
  return perms.includes(PERMISSIONS.PROJECT_READ_PUBLIC) ||
         perms.includes(PERMISSIONS.PROJECT_READ_INTERNAL);
}

/**
 * Get the visibility scope for projects based on user role.
 */
export function getVisibleProjects(user: UserContext): VisibilityScope {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  if (user.role === UserRole.ADMIN || user.role === UserRole.OFFICER) {
    return 'all';
  }

  if (user.role === UserRole.MP) {
    return 'constituency';
  }

  if (perms.includes(PERMISSIONS.FINDING_READ)) {
    return 'assigned';
  }

  return 'public';
}

/**
 * Build Prisma where clause for project visibility.
 */
export function getProjectVisibilityFilter(user: UserContext): Record<string, unknown> {
  const scope = getVisibleProjects(user);

  switch (scope) {
    case 'all':
      return {};

    case 'constituency':
      if (user.constituency) {
        return { constituency: user.constituency };
      }
      return { clearanceLevel: 'PUBLIC' };

    case 'assigned':
      return {
        OR: [
          { assignedToId: user.userId },
          { clearanceLevel: { in: ['PUBLIC', 'INTERNAL'] } },
        ],
      };

    case 'public':
    default:
      return { clearanceLevel: 'PUBLIC' };
  }
}

// ── Finding Access ────────────────────────────────────────────────────────────

/**
 * Check if user can access a specific finding.
 */
export function canAccessFinding(user: UserContext, finding: FindingContext): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  if (!perms.includes(PERMISSIONS.FINDING_READ)) {
    return false;
  }

  // Restricted findings need restricted permission
  if (finding.clearanceLevel === 'RESTRICTED') {
    return perms.includes(PERMISSIONS.FINDING_REVIEW);
  }

  return true;
}

/**
 * Build Prisma where clause for finding visibility.
 */
export function getFindingVisibilityFilter(user: UserContext): Record<string, unknown> {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  if (user.role === UserRole.ADMIN || perms.includes(PERMISSIONS.FINDING_REVIEW)) {
    return {};
  }

  return {
    clearanceLevel: { not: 'RESTRICTED' },
  };
}

// ── Case Access ───────────────────────────────────────────────────────────────

/**
 * Check if user can access a specific case.
 */
export function canAccessCase(user: UserContext, caseData: CaseContext): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);

  if (!perms.includes(PERMISSIONS.CASE_VERIFY)) {
    return false;
  }

  // Admin can access all cases
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Assigned officer can access their case
  if (caseData.assignedToId === user.userId) {
    return true;
  }

  // Reviewer can access any case
  if (user.role === UserRole.REVIEWER) {
    return true;
  }

  return false;
}

/**
 * Build Prisma where clause for case visibility.
 */
export function getCaseVisibilityFilter(user: UserContext): Record<string, unknown> {
  if (user.role === UserRole.ADMIN || user.role === UserRole.REVIEWER) {
    return {};
  }

  return {
    assignedToId: user.userId,
  };
}

// ── Permission Checks ────────────────────────────────────────────────────────

/**
 * Check if user has a specific permission.
 */
export function checkPermission(user: UserContext, permission: Permission): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);
  return perms.includes(permission);
}

/**
 * Check if user has any of the specified permissions.
 */
export function checkAnyPermission(user: UserContext, permissions: Permission[]): boolean {
  const perms = user.permissions.length > 0
    ? user.permissions
    : getPermissionsForRole(user.role);
  return permissions.some(p => perms.includes(p));
}

/**
 * Build a UserContext from role and optional permissions array.
 */
export function buildUserContext(
  role: UserRole,
  userId: string,
  permissions?: Permission[],
  extra?: { constituency?: string | null }
): UserContext {
  return {
    userId,
    role,
    constituency: extra?.constituency,
    permissions: permissions ?? getPermissionsForRole(role),
  };
}
