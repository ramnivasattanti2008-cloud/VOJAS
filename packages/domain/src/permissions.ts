/**
 * M14: Centralized Permission System
 *
 * ROLE → PERMISSIONS → RESOURCE → ACTION
 *
 * This is the single source of truth for all role-based access control.
 * Used by both API middleware and frontend navigation.
 */

import type { UserRole } from '@vojas/shared';

// ── Permission Types ──────────────────────────────────────────────────────────

export type Permission =
  // Public
  | 'public.projects.read'
  | 'public.reports.read'
  | 'public.map.read'
  | 'public.sectors.read'
  // Authentication
  | 'auth.login'
  | 'auth.register'
  | 'auth.refresh'
  // Project
  | 'project.read.public'
  | 'project.read.internal'
  | 'project.read.restricted'
  | 'project.read.own'
  | 'project.read.constituency'
  | 'project.read.assigned'
  | 'project.create'
  | 'project.update'
  | 'project.update.constituency'
  | 'project.update.assigned'
  | 'project.delete'
  // Finding
  | 'finding.read'
  | 'finding.read.restricted'
  | 'finding.review'
  | 'finding.acknowledge'
  | 'finding.assign'
  | 'finding.resolve'
  | 'finding.dismiss'
  | 'finding.escalate'
  // Case
  | 'case.read'
  | 'case.create'
  | 'case.assign'
  | 'case.reassign'
  | 'case.review'
  | 'case.verify'
  | 'case.resolve'
  | 'case.reopen'
  | 'case.close'
  | 'case.escalate'
  // Field Verification
  | 'field_verification.read'
  | 'field_verification.create'
  | 'field_verification.update'
  | 'field_verification.submit'
  // Document
  | 'document.read'
  | 'document.read.public'
  | 'document.upload'
  | 'document.upload.contractor'
  | 'document.verify'
  | 'document.delete'
  // Report (Citizen)
  | 'report.create'
  | 'report.read.own'
  | 'report.read.all'
  | 'report.moderate'
  | 'report.assign'
  | 'report.update'
  | 'report.resolve'
  // Satellite
  | 'satellite.read'
  | 'satellite.read.public'
  | 'satellite.trigger'
  | 'satellite.ingest'
  // Change Analysis
  | 'analysis.read'
  | 'analysis.run'
  | 'analysis.delete'
  // Financial
  | 'financial.read.public'
  | 'financial.read.internal'
  | 'financial.read.restricted'
  // Notifications
  | 'notification.read'
  | 'notification.read.all'
  | 'notification.update'
  // MP-specific
  | 'mp.constituency.read'
  | 'mp.portfolio.read'
  | 'mp.development_demand.read'
  | 'mp.report.generate'
  // Contractor
  | 'contractor.milestone.submit'
  | 'contractor.milestone.respond'
  | 'contractor.document.upload'
  | 'contractor.response.submit'
  | 'contractor.issue.create'
  // Officer
  | 'officer.verification.queue'
  | 'officer.case.workspace'
  | 'officer.evidence.add'
  | 'officer.notes.add'
  | 'officer.inspection.request'
  | 'officer.inspection.assign'
  // Sector
  | 'sector.read'
  | 'sector.configure'
  // Risk
  | 'risk.read'
  | 'risk.read.restricted'
  | 'risk.threshold.update'
  // Admin
  | 'admin.users.read'
  | 'admin.users.create'
  | 'admin.users.update'
  | 'admin.users.delete'
  | 'admin.roles.manage'
  | 'admin.permissions.manage'
  | 'admin.sources.manage'
  | 'admin.rules.manage'
  | 'admin.jobs.manage'
  | 'admin.health.read'
  | 'admin.audit.read'
  | 'admin.config.manage'
  | 'admin.ai.manage'
  | 'admin.satellite.manage'
  | 'admin.system.manage';

// ── Role → Permissions Mapping ────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  // VIEWER: minimal read-only
  VIEWER: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'sector.read',
    'financial.read.public',
    'satellite.read.public',
    'notification.read',
  ],

  // CITIZEN: public + own reports + nearby projects
  CITIZEN: [
    'auth.login',
    'auth.register',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'sector.read',
    'financial.read.public',
    'satellite.read.public',
    'document.read.public',
    'report.create',
    'report.read.own',
    'notification.read',
    'notification.update',
  ],

  // MP: constituency-level access + permitted internal data
  MP: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.constituency',
    'sector.read',
    'financial.read.public',
    'satellite.read.public',
    'document.read.public',
    'report.read.all',
    'mp.constituency.read',
    'mp.portfolio.read',
    'mp.development_demand.read',
    'mp.report.generate',
    'notification.read',
    'notification.update',
    'finding.read',
    'case.read',
  ],

  // OFFICER: full operational access for assigned work
  OFFICER: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.internal',
    'project.read.assigned',
    'project.update.assigned',
    'sector.read',
    'financial.read.internal',
    'satellite.read',
    'document.read',
    'document.upload',
    'document.verify',
    'finding.read',
    'finding.review',
    'finding.acknowledge',
    'finding.assign',
    'finding.resolve',
    'finding.dismiss',
    'case.read',
    'case.create',
    'case.assign',
    'case.reassign',
    'case.review',
    'case.verify',
    'case.resolve',
    'case.reopen',
    'case.escalate',
    'field_verification.read',
    'field_verification.create',
    'field_verification.update',
    'field_verification.submit',
    'officer.verification.queue',
    'officer.case.workspace',
    'officer.evidence.add',
    'officer.notes.add',
    'officer.inspection.request',
    'officer.inspection.assign',
    'report.read.all',
    'report.moderate',
    'report.assign',
    'report.update',
    'report.resolve',
    'notification.read',
    'notification.read.all',
    'notification.update',
    'analysis.read',
    'analysis.run',
    'risk.read',
  ],

  // FIELD_OFFICER: mobile-first field verification
  FIELD_OFFICER: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.assigned',
    'sector.read',
    'satellite.read.public',
    'document.read.public',
    'field_verification.read',
    'field_verification.create',
    'field_verification.update',
    'field_verification.submit',
    'officer.evidence.add',
    'officer.notes.add',
    'notification.read',
    'notification.update',
  ],

  // CONTRACTOR: own projects + milestone/doc responses
  CONTRACTOR: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.own',
    'sector.read',
    'financial.read.public',
    'satellite.read.public',
    'document.read.public',
    'document.upload.contractor',
    'contractor.milestone.submit',
    'contractor.milestone.respond',
    'contractor.document.upload',
    'contractor.response.submit',
    'contractor.issue.create',
    'notification.read',
    'notification.update',
    'case.read',
    'case.review',
  ],

  // ANALYST: read-only deep access across the system
  ANALYST: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.internal',
    'project.read.restricted',
    'sector.read',
    'financial.read.internal',
    'satellite.read',
    'document.read',
    'finding.read',
    'finding.read.restricted',
    'case.read',
    'report.read.all',
    'analysis.read',
    'analysis.run',
    'risk.read',
    'risk.read.restricted',
    'notification.read',
    'notification.read.all',
  ],

  // REVIEWER: read + moderate + limited write
  REVIEWER: [
    'auth.login',
    'auth.refresh',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.internal',
    'sector.read',
    'financial.read.internal',
    'satellite.read',
    'document.read',
    'finding.read',
    'finding.review',
    'finding.acknowledge',
    'case.read',
    'case.create',
    'case.review',
    'case.verify',
    'report.read.all',
    'report.moderate',
    'report.assign',
    'report.update',
    'report.resolve',
    'analysis.read',
    'risk.read',
    'notification.read',
    'notification.read.all',
    'notification.update',
  ],

  // ADMIN: full system access
  ADMIN: [
    'auth.login',
    'auth.refresh',
    'auth.register',
    'public.projects.read',
    'public.reports.read',
    'public.map.read',
    'public.sectors.read',
    'project.read.public',
    'project.read.internal',
    'project.read.restricted',
    'project.read.own',
    'project.read.constituency',
    'project.read.assigned',
    'project.create',
    'project.update',
    'project.update.constituency',
    'project.update.assigned',
    'project.delete',
    'sector.read',
    'sector.configure',
    'financial.read.public',
    'financial.read.internal',
    'financial.read.restricted',
    'satellite.read',
    'satellite.trigger',
    'satellite.ingest',
    'document.read',
    'document.upload',
    'document.verify',
    'document.delete',
    'report.create',
    'report.read.own',
    'report.read.all',
    'report.moderate',
    'report.assign',
    'report.update',
    'report.resolve',
    'finding.read',
    'finding.read.restricted',
    'finding.review',
    'finding.acknowledge',
    'finding.assign',
    'finding.resolve',
    'finding.dismiss',
    'finding.escalate',
    'case.read',
    'case.create',
    'case.assign',
    'case.reassign',
    'case.review',
    'case.verify',
    'case.resolve',
    'case.reopen',
    'case.close',
    'case.escalate',
    'field_verification.read',
    'field_verification.create',
    'field_verification.update',
    'field_verification.submit',
    'analysis.read',
    'analysis.run',
    'analysis.delete',
    'risk.read',
    'risk.read.restricted',
    'risk.threshold.update',
    'mp.constituency.read',
    'mp.portfolio.read',
    'mp.development_demand.read',
    'mp.report.generate',
    'contractor.milestone.submit',
    'contractor.milestone.respond',
    'contractor.document.upload',
    'contractor.response.submit',
    'contractor.issue.create',
    'officer.verification.queue',
    'officer.case.workspace',
    'officer.evidence.add',
    'officer.notes.add',
    'officer.inspection.request',
    'officer.inspection.assign',
    'notification.read',
    'notification.read.all',
    'notification.update',
    'admin.users.read',
    'admin.users.create',
    'admin.users.update',
    'admin.users.delete',
    'admin.roles.manage',
    'admin.permissions.manage',
    'admin.sources.manage',
    'admin.rules.manage',
    'admin.jobs.manage',
    'admin.health.read',
    'admin.audit.read',
    'admin.config.manage',
    'admin.ai.manage',
    'admin.satellite.manage',
    'admin.system.manage',
  ],
};

// ── Permission Helpers ───────────────────────────────────────────────────────

/** Check if a role has a specific permission */
export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

/** Check if a role has ANY of the specified permissions */
export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

/** Check if a role has ALL of the specified permissions */
export function hasAllPermissions(role: UserRole, permissions: Permission[]): boolean {
  return permissions.every((p) => hasPermission(role, p));
}

/** Get all permissions for a role */
export function getPermissions(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

/** Check if role is an admin-level role */
export function isAdminRole(role: UserRole): boolean {
  return role === 'ADMIN';
}

/** Check if role can manage users */
export function canManageUsers(role: UserRole): boolean {
  return hasPermission(role, 'admin.users.read');
}

/** Check if role can access officer workspace */
export function isOfficerRole(role: UserRole): boolean {
  return role === 'OFFICER' || role === 'FIELD_OFFICER';
}

/** Check if role is MP */
export function isMPRole(role: UserRole): boolean {
  return role === 'MP';
}

/** Check if role is citizen */
export function isCitizenRole(role: UserRole): boolean {
  return role === 'CITIZEN' || role === 'VIEWER';
}

/** Check if role is contractor */
export function isContractorRole(role: UserRole): boolean {
  return role === 'CONTRACTOR';
}

/** Check if role can review/verify */
export function canVerify(role: UserRole): boolean {
  return hasAnyPermission(role, ['case.verify', 'finding.review', 'field_verification.submit']);
}

/** Get role category for UI display */
export function getRoleCategory(role: UserRole): string {
  if (role === 'ADMIN') return 'Administrator';
  if (role === 'OFFICER' || role === 'FIELD_OFFICER') return 'Government Officer';
  if (role === 'ANALYST' || role === 'REVIEWER') return 'Intelligence Analyst';
  if (role === 'MP') return 'Member of Parliament';
  if (role === 'CONTRACTOR') return 'Contractor';
  if (role === 'CITIZEN') return 'Citizen';
  return 'Viewer';
}

/** Get role color for UI badges */
export function getRoleColor(role: UserRole): string {
  switch (role) {
    case 'ADMIN': return 'text-red-600 bg-red-50 border-red-200';
    case 'OFFICER': return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'FIELD_OFFICER': return 'text-cyan-600 bg-cyan-50 border-cyan-200';
    case 'ANALYST': return 'text-purple-600 bg-purple-50 border-purple-200';
    case 'REVIEWER': return 'text-indigo-600 bg-indigo-50 border-indigo-200';
    case 'MP': return 'text-amber-600 bg-amber-50 border-amber-200';
    case 'CONTRACTOR': return 'text-green-600 bg-green-50 border-green-200';
    case 'CITIZEN': return 'text-teal-600 bg-teal-50 border-teal-200';
    case 'VIEWER': return 'text-slate-500 bg-slate-50 border-slate-200';
    default: return 'text-slate-500 bg-slate-50 border-slate-200';
  }
}
