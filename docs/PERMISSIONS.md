# VOJAS Complete Permission Reference

## Quick Reference Table

| Permission Key | Description | Roles |
|---|---|---|
| `project.create` | Create new project record | ADMIN, OFFICER |
| `project.read` | Read project data | all |
| `project.readPublic` | Read public project fields | all (auto) |
| `project.readConstituency` | Read constituency-scoped fields | ADMIN, OFFICER, MP |
| `project.readOrganization` | Read contractor-org fields | ADMIN, OFFICER, CONTRACTOR |
| `project.update` | Update project data | ADMIN, OFFICER, CONTRACTOR (own) |
| `project.delete` | Delete project | ADMIN |
| `project.approve` | Approve project milestone | ADMIN, OFFICER |
| `project.reject` | Reject project milestone | ADMIN, OFFICER |
| `project.escalate` | Escalate project | ADMIN, OFFICER, MP, CONTRACTOR |
| `project.verify` | Verify project evidence | ADMIN, OFFICER |
| `project.export` | Export project data | all |
| `project.admin` | Admin-level project actions | ADMIN |
| `report.create` | Submit citizen report | OFFICER, MP, CONTRACTOR, CITIZEN |
| `report.read` | Read report | all |
| `report.update` | Update report | OFFICER (all), MP (own), CITIZEN (own) |
| `report.delete` | Delete report | ADMIN, OFFICER |
| `report.approve` | Approve report | OFFICER |
| `report.reject` | Reject report | OFFICER |
| `report.escalate` | Escalate report | OFFICER, MP, CITIZEN |
| `report.verify` | Verify report evidence | OFFICER |
| `report.export` | Export reports | all |
| `finding.read` | Read risk findings | all |
| `finding.create` | Create finding | ADMIN, OFFICER |
| `finding.update` | Update finding | ADMIN, OFFICER |
| `finding.review` | Mark finding reviewed | ADMIN, OFFICER |
| `finding.escalate` | Escalate finding | ADMIN, OFFICER, MP |
| `finding.export` | Export findings | all |
| `case.create` | Open investigation case | ADMIN, OFFICER |
| `case.read` | Read case | ADMIN, OFFICER, MP (constituency), CONTRACTOR (own), REVIEWER |
| `case.update` | Update case | ADMIN, OFFICER |
| `case.verify` | Verify case evidence | ADMIN, OFFICER |
| `case.approve` | Approve case action | ADMIN, OFFICER |
| `case.reject` | Reject case action | ADMIN, OFFICER |
| `case.escalate` | Escalate to higher authority | ADMIN, OFFICER, MP |
| `case.export` | Export case data | all |
| `vendor.read` | Read vendor data | all |
| `vendor.create` | Create vendor | ADMIN |
| `vendor.update` | Update vendor | ADMIN |
| `vendor.verify` | Verify vendor credentials | ADMIN, OFFICER |
| `vendor.export` | Export vendor data | all |
| `vendor.admin` | Admin vendor actions | ADMIN |
| `document.create` | Upload document | ADMIN, OFFICER, MP, CONTRACTOR |
| `document.read` | Read document | all |
| `document.update` | Update document | ADMIN, OFFICER, CONTRACTOR (own) |
| `document.delete` | Delete document | ADMIN |
| `document.export` | Export documents | all |
| `satellite.read` | Read satellite observations | ADMIN, OFFICER, MP, REVIEWER |
| `satellite.analyze` | Trigger satellite analysis | ADMIN, OFFICER |
| `satellite.verify` | Verify satellite evidence | ADMIN, OFFICER |
| `satellite.export` | Export satellite data | all |
| `financial.read` | Read financial data | all |
| `financial.update` | Update financial records | ADMIN, OFFICER, CONTRACTOR (own) |
| `financial.approve` | Approve payment | ADMIN, OFFICER, CONTRACTOR |
| `financial.export` | Export financial data | all |
| `user.create` | Create user | ADMIN |
| `user.read` | Read user profile | all (own), ADMIN (all) |
| `user.update` | Update user profile | own, ADMIN |
| `user.delete` | Delete user | ADMIN |
| `user.admin` | Admin user management | ADMIN |
| `notification.create` | Create notification | all who can trigger |
| `notification.read` | Read notifications | own, ADMIN (all) |
| `notification.update` | Update notification | own, ADMIN |
| `notification.delete` | Delete notification | own, ADMIN |
| `notification.escalate` | Trigger escalation notification | OFFICER, MP, ADMIN |
| `audit.read` | Read audit logs | ADMIN |
| `audit.export` | Export audit logs | ADMIN |
| `verification.queue` | Access verification queue | ADMIN, OFFICER |
| `verification.submit` | Submit verification result | OFFICER |
| `escalation.submit` | Submit escalation | ADMIN, OFFICER, MP, CONTRACTOR, CITIZEN |
| `escalation.override` | Override escalation | ADMIN |
| `export.bulk` | Bulk data export | ADMIN, OFFICER, REVIEWER |
| `export.public` | Export public data | all |
| `admin.system` | System configuration | ADMIN |
| `admin.tenant` | Multi-tenant management | ADMIN |
| `admin.role` | Assign/modify roles | ADMIN |

---

## Permission Service API

### File: `apps/api/src/services/permissions.ts`

```typescript
// apps/api/src/services/permissions.ts

export type Role = 'ADMIN' | 'OFFICER' | 'MP' | 'CONTRACTOR' | 'CITIZEN' | 'REVIEWER';

export type Permission =
  | 'project.create' | 'project.read' | 'project.update' | 'project.delete'
  | 'project.approve' | 'project.reject' | 'project.escalate' | 'project.verify'
  | 'project.export' | 'project.admin'
  | 'report.create' | 'report.read' | 'report.update' | 'report.delete'
  | 'report.approve' | 'report.reject' | 'report.escalate' | 'report.verify'
  | 'report.export'
  | 'finding.read' | 'finding.create' | 'finding.update' | 'finding.review'
  | 'finding.escalate' | 'finding.export'
  | 'case.create' | 'case.read' | 'case.update' | 'case.verify'
  | 'case.approve' | 'case.reject' | 'case.escalate' | 'case.export'
  | 'vendor.read' | 'vendor.create' | 'vendor.update' | 'vendor.verify'
  | 'vendor.export' | 'vendor.admin'
  | 'document.create' | 'document.read' | 'document.update' | 'document.delete'
  | 'document.export'
  | 'satellite.read' | 'satellite.analyze' | 'satellite.verify' | 'satellite.export'
  | 'financial.read' | 'financial.update' | 'financial.approve' | 'financial.export'
  | 'user.create' | 'user.read' | 'user.update' | 'user.delete' | 'user.admin'
  | 'notification.create' | 'notification.read' | 'notification.update'
  | 'notification.delete' | 'notification.escalate'
  | 'audit.read' | 'audit.export'
  | 'verification.queue' | 'verification.submit'
  | 'escalation.submit' | 'escalation.override'
  | 'export.bulk' | 'export.public'
  | 'admin.system' | 'admin.tenant' | 'admin.role';

// Role → granted permissions
export const ROLE_PERMISSION_MAP: Record<Role, Set<Permission>> = {
  ADMIN: new Set([
    'project.create', 'project.read', 'project.update', 'project.delete',
    'project.approve', 'project.reject', 'project.escalate', 'project.verify',
    'project.export', 'project.admin',
    'report.create', 'report.read', 'report.update', 'report.delete',
    'report.approve', 'report.reject', 'report.escalate', 'report.verify',
    'report.export',
    'finding.read', 'finding.create', 'finding.update', 'finding.review',
    'finding.escalate', 'finding.export',
    'case.create', 'case.read', 'case.update', 'case.verify',
    'case.approve', 'case.reject', 'case.escalate', 'case.export',
    'vendor.read', 'vendor.create', 'vendor.update', 'vendor.verify',
    'vendor.export', 'vendor.admin',
    'document.create', 'document.read', 'document.update', 'document.delete',
    'document.export',
    'satellite.read', 'satellite.analyze', 'satellite.verify', 'satellite.export',
    'financial.read', 'financial.update', 'financial.approve', 'financial.export',
    'user.create', 'user.read', 'user.update', 'user.delete', 'user.admin',
    'notification.create', 'notification.read', 'notification.update',
    'notification.delete', 'notification.escalate',
    'audit.read', 'audit.export',
    'verification.queue', 'verification.submit',
    'escalation.submit', 'escalation.override',
    'export.bulk', 'export.public',
    'admin.system', 'admin.tenant', 'admin.role',
  ]),

  OFFICER: new Set([
    'project.read', 'project.escalate', 'project.verify', 'project.export',
    'report.create', 'report.read', 'report.update',
    'report.approve', 'report.reject', 'report.escalate', 'report.verify',
    'report.export',
    'finding.read', 'finding.create', 'finding.update', 'finding.review',
    'finding.escalate', 'finding.export',
    'case.create', 'case.read', 'case.update', 'case.verify',
    'case.approve', 'case.reject', 'case.escalate', 'case.export',
    'vendor.read', 'vendor.verify', 'vendor.export',
    'document.create', 'document.read', 'document.update', 'document.export',
    'satellite.read', 'satellite.verify', 'satellite.export',
    'financial.read', 'financial.export',
    'user.read',
    'notification.create', 'notification.read', 'notification.update',
    'notification.delete', 'notification.escalate',
    'verification.queue', 'verification.submit',
    'escalation.submit', 'export.bulk', 'export.public',
  ]),

  MP: new Set([
    'project.read', 'project.escalate', 'project.export',
    'report.create', 'report.read', 'report.update',
    'report.escalate', 'report.export',
    'finding.read', 'finding.escalate', 'finding.export',
    'case.read', 'case.escalate', 'case.export',
    'vendor.read', 'vendor.export',
    'document.read', 'document.export',
    'satellite.read', 'satellite.export',
    'financial.read', 'financial.export',
    'user.read', 'user.update',
    'notification.create', 'notification.read', 'notification.update',
    'notification.delete', 'notification.escalate',
    'escalation.submit', 'export.public',
  ]),

  CONTRACTOR: new Set([
    'project.read', 'project.update', 'project.escalate',
    'report.create', 'report.read', 'report.update', 'report.escalate',
    'vendor.read',
    'document.create', 'document.read', 'document.update', 'document.export',
    'financial.read', 'financial.update', 'financial.approve', 'financial.export',
    'user.read', 'user.update',
    'escalation.submit', 'export.public',
  ]),

  CITIZEN: new Set([
    'project.read', 'project.export',
    'report.create', 'report.read', 'report.update', 'report.escalate',
    'finding.read', 'finding.export',
    'vendor.read',
    'document.read',
    'financial.read', 'financial.export',
    'user.read', 'user.update',
    'export.public',
  ]),

  REVIEWER: new Set([
    'project.read', 'project.export',
    'report.read', 'report.export',
    'finding.read', 'finding.export',
    'case.read', 'case.export',
    'vendor.read', 'vendor.export',
    'document.read', 'document.export',
    'satellite.read', 'satellite.export',
    'financial.read', 'financial.export',
    'audit.read', 'audit.export',
    'export.bulk', 'export.public',
  ]),
};

/**
 * Check if a role has a specific permission.
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSION_MAP[role]?.has(permission) ?? false;
}

/**
 * Get all permissions for a role (for UI role cards/debug).
 */
export function getPermissions(role: Role): Permission[] {
  return Array.from(ROLE_PERMISSION_MAP[role] ?? []);
}

/**
 * Check if role A has all permissions of role B (hierarchy check).
 */
export function roleHasAtLeast(roleA: Role, roleB: Role): boolean {
  const permsB = ROLE_PERMISSION_MAP[roleB] ?? new Set();
  const permsA = ROLE_PERMISSION_MAP[roleA] ?? new Set();
  for (const p of permsB) {
    if (!permsA.has(p)) return false;
  }
  return true;
}

/**
 * Roles ordered by privilege (least → most).
 */
export const ROLE_HIERARCHY: Role[] = [
  'CITIZEN',
  'CONTRACTOR',
  'MP',
  'REVIEWER',
  'OFFICER',
  'ADMIN',
];

/**
 * Get data scoping level for a role+resource combination.
 * Used by repositories to determine row-level filter.
 */
export function getScopeLevel(
  role: Role
): 'none' | 'public' | 'own' | 'constituency' | 'organization' | 'all' {
  switch (role) {
    case 'ADMIN':
    case 'OFFICER':
      return 'all';
    case 'MP':
      return 'constituency';
    case 'CONTRACTOR':
      return 'organization';
    case 'REVIEWER':
      return 'public';
    case 'CITIZEN':
      return 'own'; // can see public + own
    default:
      return 'public';
  }
}
```

---

## Middleware Usage

### `requirePermission` Middleware

```typescript
// apps/api/src/middleware/requirePermission.ts
import { hasPermission, type Permission } from '../services/permissions';

export function requirePermission(permission: Permission) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser;
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!hasPermission(user.role, permission)) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'PERMISSION_DENIED',
          resource: permission,
          ip: req.ip,
          userAgent: req.headers['user-agent'],
          metadata: { role: user.role },
        },
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

### Usage in Routes

```typescript
import { requirePermission } from '../middleware/requirePermission';

// Simple
router.post('/projects', authenticate, requirePermission('project.create'), createProject);

// Multiple permissions (any one grants access)
router.get('/admin/users', authenticate, requireAnyPermission(['user.admin', 'user.read']));

// Multiple permissions (all required)
router.delete('/admin/users/:id', authenticate, requireAllPermissions(['user.delete', 'user.admin']));
```

---

## Repository Data Scoping

```typescript
// apps/api/src/repositories/projectRepository.ts
import { getScopeLevel, type Role } from '../services/permissions';

interface FindProjectsParams {
  role: Role;
  userId: string;
  constituencyId?: string;
  organizationId?: string;
  search?: string;
  status?: ProjectStatus;
  page?: number;
  pageSize?: number;
}

export async function findProjects(params: FindProjectsParams) {
  const { role, userId, constituencyId, organizationId, search, status, page = 1, pageSize = 20 } = params;
  const scope = getScopeLevel(role);

  const where: Prisma.ProjectWhereInput = {
    deletedAt: null,
  };

  // Apply row-level scoping
  if (scope === 'all') {
    // no filter — ADMIN and OFFICER see everything
  } else if (scope === 'constituency') {
    where.constituencyId = constituencyId;
  } else if (scope === 'organization') {
    where.contractorId = organizationId;
  } else if (scope === 'own') {
    where.OR = [
      { visibility: 'public' },
      { createdById: userId },
    ];
  } else {
    where.visibility = 'public';
  }

  // Add filters
  if (search) {
    where.AND = (where.AND ?? []);
    (where.AND as Prisma.ProjectWhereInput[]).push({
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    });
  }
  if (status) {
    where.status = status;
  }

  const [data, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      orderBy: { updatedAt: 'desc' },
      include: getProjectIncludes(role),
    }),
    prisma.project.count({ where }),
  ]);

  return {
    data: data.map(p => sanitizeProject(p, role)),
    pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) },
  };
}
```

---

## React Query Hook Usage

```typescript
// apps/web/src/hooks/usePermission.ts
import { hasPermission, type Permission } from '@vojas/api-client';

// Hook for permission checks in components
export function useCan(permission: Permission): boolean {
  const { data: user } = useCurrentUser();
  if (!user) return false;
  return hasPermission(user.role, permission);
}

// Usage in component
function ProjectActions({ project }: { project: Project }) {
  const canVerify = useCan('project.verify');
  const canEscalate = useCan('project.escalate');
  const canDelete = useCan('project.delete');

  return (
    <div className="flex gap-2">
      {canVerify && <VerifyButton projectId={project.id} />}
      {canEscalate && <EscalateButton projectId={project.id} />}
      {canDelete && <DeleteButton projectId={project.id} />}
    </div>
  );
}

// Gate entire sections
{useCan('verification.queue') && <VerificationQueue />}

// Role display
function RoleBadge({ role }: { role: Role }) {
  const labels: Record<Role, string> = {
    ADMIN: 'Administrator',
    OFFICER: 'Verification Officer',
    MP: 'Member of Parliament',
    CONTRACTOR: 'Contractor',
    CITIZEN: 'Citizen',
    REVIEWER: 'Auditor / Reviewer',
  };
  return <span className="badge">{labels[role]}</span>;
}
```

---

## Field Sanitization

```typescript
// apps/api/src/utils/sanitize.ts

// Fields hidden per role
const FIELD_HIDDEN_BY_ROLE: Record<Role, (keyof Project)[]> = {
  ADMIN: [],
  OFFICER: [],
  MP: ['internalNotes', 'acbReferral', 'riskScoreInternal'],
  CONTRACTOR: ['internalNotes', 'acbReferral', 'riskScoreInternal', 'officerNotes'],
  CITIZEN: [
    'internalNotes', 'acbReferral', 'riskScore', 'riskScoreInternal',
    'officerNotes', 'verificationStatus', 'acbReferral',
  ],
  REVIEWER: ['internalNotes', 'acbReferral', 'officerNotes'],
};

export function sanitizeProject<T extends Project>(project: T, role: Role): Omit<T, string> {
  const hidden = FIELD_HIDDEN_BY_ROLE[role] ?? [];
  const result = { ...project };
  hidden.forEach(field => delete result[field as keyof T]);
  return result as Omit<T, string>;
}
```

---

## API Client Permission Helpers

```typescript
// packages/api-client/src/permissions.ts
export { hasPermission, getPermissions, roleHasAtLeast, getScopeLevel, ROLE_HIERARCHY, type Permission, type Role } from '@vojas/api/src/services/permissions';

// Pre-built permission sets for UI
export const PERMISSION_GROUPS = {
  canVerify: ['project.verify', 'report.verify', 'case.verify', 'vendor.verify', 'satellite.verify'],
  canEscalate: ['project.escalate', 'report.escalate', 'finding.escalate', 'case.escalate'],
  canExport: ['project.export', 'report.export', 'financial.export'],
  canManageUsers: ['user.create', 'user.update', 'user.delete', 'user.admin'],
} as const;
```
