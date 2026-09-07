/**
 * VOJAS RBAC — Re-exports from canonical implementation in middleware/auth
 *
 * The permission constants and helpers live in:
 *   - @vojas/shared/src/permissions.ts  (types, constants, ROLE_PERMISSIONS)
 *   - @vojas/shared/src/rbac.ts         (context helpers, access checks)
 *   - apps/api/src/middleware/auth.ts   (Express middleware: requirePermission, etc.)
 *
 * Import from '../middleware/auth' for route-level middleware.
 * Import from '@vojas/shared' for permission constants and type helpers.
 */

// Re-export all middleware helpers for convenience
export {
  authenticate,
  optionalAuth,
  requireAuth,
  requireRole,
  requirePermission,
  requireAnyPermission,
  requireAllPermissions,
} from '../middleware/auth.js';

// Also re-export shared helpers for convenience
export {
  hasPermission,
  hasAnyPermission,
  hasAllPermissions,
  getPermissionsForRole,
  roleHasPermission,
  Permission,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLE_DISPLAY_NAMES,
  getRoleDisplayName,
  canAccess,
  canAccessProject,
  canAccessFinding,
  canAccessCase,
  getVisibleProjects,
  getProjectVisibilityFilter,
  getFindingVisibilityFilter,
  getCaseVisibilityFilter,
  buildUserContext,
  type VisibilityScope,
  type ProjectContext,
  type FindingContext,
  type CaseContext,
  type UserContext,
} from '@vojas/shared';
