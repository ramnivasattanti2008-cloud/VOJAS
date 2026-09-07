# VOJAS RBAC System

## Overview

VOJAS uses attribute-based role-based access control (ABAC/RBAC hybrid) with data scoping at the row and field level. Permissions are defined as structured strings and evaluated by a central `permissions.ts` service. All API routes are guarded via middleware; all UI components use the same permission hooks for conditional rendering.

---

## Roles

| Role | Code | Description |
|---|---|---|
| Administrator | `ADMIN` | Full system access, all tenants, all resources |
| Officer | `OFFICER` | Verification, cases, evidence, field operations, escalation |
| Member of Parliament | `MP` | Constituency-scoped projects, limited finance, citizen signal review |
| Contractor | `CONTRACTOR` | Own projects, milestones, documents, payment requests |
| Citizen | `CITIZEN` | Public projects, own reports, follow/watch |
| Reviewer | `REVIEWER` | Read-only investigation access, audit log |

---

## Permission Format

```
resource.action.level
```

| Part | Values | Example |
|---|---|---|
| `resource` | project, report, finding, case, vendor, document, satellite, financial, user, notification, audit | `project` |
| `action` | create, read, update, delete, approve, reject, escalate, verify, export | `read` |
| `level` | public, own, constituency, organization, admin | `own` |

Examples:
- `project.read.public` — anyone can view public project data
- `project.read.constituency` — MP or Officer can view constituency-scoped projects
- `finding.review` — OFFICER+ can review risk findings
- `case.verify` — OFFICER+ can verify cases
- `user.delete.admin` — ADMIN only

---

## Role → Permissions Matrix

### ADMIN

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export | Admin |
|---|---|---|---|---|---|---|---|---|---|---|
| project | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | ✓ | ✓ | ✓ |
| report | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| finding | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| case | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| vendor | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ |
| document | ✓ | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ |
| satellite | ✓ | ✓ | ✓ | ✓ | — | — | — | ✓ | ✓ | ✓ |
| financial | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ |
| user | ✓ | ✓ | ✓ | ✓ | — | — | — | — | ✓ | ✓ |
| notification | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ | ✓ |
| audit | — | ✓ | — | — | — | — | — | — | ✓ | ✓ |

### OFFICER

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export |
|---|---|---|---|---|---|---|---|---|---|
| project | — | ✓ | — | — | — | — | ✓ | ✓ | ✓ |
| report | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| finding | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| case | ✓ | ✓ | ✓ | — | ✓ | ✓ | ✓ | ✓ | ✓ |
| vendor | — | ✓ | — | — | — | — | — | ✓ | ✓ |
| document | ✓ | ✓ | ✓ | — | — | — | — | — | ✓ |
| satellite | — | ✓ | — | — | — | — | — | ✓ | ✓ |
| financial | — | ✓ | — | — | — | — | — | ✓ | ✓ |
| user | — | ✓ | — | — | — | — | — | — | — |
| notification | ✓ | ✓ | ✓ | ✓ | — | — | ✓ | — | ✓ |

### MP

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export |
|---|---|---|---|---|---|---|---|---|---|
| project | — | constituency | — | — | — | — | ✓ | — | ✓ |
| report | ✓ | constituency | own | — | — | — | ✓ | — | ✓ |
| finding | — | constituency | — | — | — | — | ✓ | — | ✓ |
| case | — | constituency | — | — | — | — | — | — | ✓ |
| vendor | — | constituency | — | — | — | — | — | — | — |
| document | — | constituency | — | — | — | — | — | — | ✓ |
| satellite | — | constituency | — | — | — | — | — | — | ✓ |
| financial | — | constituency | — | — | — | — | — | — | ✓ |
| user | — | own | own | — | — | — | — | — | — |
| notification | ✓ | constituency | own | own | — | — | ✓ | — | ✓ |

### CONTRACTOR

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export |
|---|---|---|---|---|---|---|---|---|---|
| project | — | own | own | — | — | — | ✓ | — | — |
| report | ✓ | own | own | — | — | — | ✓ | — | — |
| finding | — | own | — | — | — | — | — | — | — |
| case | — | own | — | — | — | — | — | — | — |
| vendor | — | own | — | — | — | — | — | — | — |
| document | ✓ | own | own | — | — | — | — | — | ✓ |
| satellite | — | own | — | — | — | — | — | — | — |
| financial | — | own | ✓ | — | ✓ | — | — | — | ✓ |
| user | — | own | own | — | — | — | — | — | — |
| notification | — | own | — | — | — | — | — | — | — |

### CITIZEN

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export |
|---|---|---|---|---|---|---|---|---|---|
| project | — | public | — | — | — | — | — | — | — |
| report | ✓ | own | own | — | — | — | ✓ | — | — |
| finding | — | public | — | — | — | — | — | — | — |
| case | — | public | — | — | — | — | — | — | — |
| vendor | — | public | — | — | — | — | — | — | — |
| document | — | public | — | — | — | — | — | — | — |
| satellite | — | public | — | — | — | — | — | — | — |
| financial | — | public | — | — | — | — | — | — | — |
| user | — | own | own | — | — | — | — | — | — |
| notification | — | own | — | own | — | — | — | — | — |

### REVIEWER

| Resource | Create | Read | Update | Delete | Approve | Reject | Escalate | Verify | Export |
|---|---|---|---|---|---|---|---|---|---|
| project | — | ✓ | — | — | — | — | — | — | ✓ |
| report | — | ✓ | — | — | — | — | — | — | ✓ |
| finding | — | ✓ | — | — | — | — | — | — | ✓ |
| case | — | ✓ | — | — | — | — | — | — | ✓ |
| vendor | — | ✓ | — | — | — | — | — | — | ✓ |
| document | — | ✓ | — | — | — | — | — | — | ✓ |
| satellite | — | ✓ | — | — | — | — | — | — | ✓ |
| financial | — | ✓ | — | — | — | — | — | — | ✓ |
| user | — | — | — | — | — | — | — | — | ✓ |
| notification | — | — | — | — | — | — | — | — | — |

---

## Adding New Permissions

### Step 1: Define in `permissions.ts`

```typescript
// apps/api/src/services/permissions.ts
export const PERMISSIONS = {
  // existing...
  newResource: {
    create: ['ADMIN', 'OFFICER'],
    read: ['ADMIN', 'OFFICER', 'MP', 'CONTRACTOR', 'CITIZEN', 'REVIEWER'],
    readPublic: ['*'],           // anyone
    readOwn: ['*'],
    readConstituency: ['ADMIN', 'OFFICER', 'MP'],
    readOrganization: ['ADMIN', 'OFFICER'],
    update: ['ADMIN', 'OFFICER'],
    delete: ['ADMIN'],
  },
} as const;
```

### Step 2: Add to Role Permissions Map

```typescript
export const ROLE_PERMISSIONS: Record<Role, PermissionSet> = {
  ADMIN: {
    // ...
    'newresource.create': true,
    'newresource.read': true,
    'newresource.readPublic': true,
    'newresource.update': true,
    'newresource.delete': true,
  },
  // ... other roles
};
```

### Step 3: Add Data Scoping in Repository

```typescript
// apps/api/src/repositories/newResourceRepository.ts
export async function findAll(user: AuthUser): Promise<NewResource[]> {
  const scope = getScopeFilter(user.role, user.constituencyId, user.organizationId);

  return prisma.newResource.findMany({
    where: {
      ...scope,
      deletedAt: null,
    },
    include: getIncludesForRole(user.role),
  });
}

function getScopeFilter(role: Role, constituencyId?: string, organizationId?: string) {
  switch (role) {
    case 'ADMIN':
    case 'OFFICER':
      return {}; // no filter — see all
    case 'MP':
      return { constituencyId };
    case 'CONTRACTOR':
      return { contractorId: user.organizationId };
    case 'CITIZEN':
      return { isPublic: true };
    case 'REVIEWER':
      return {}; // read-only scope handled by API guard
    default:
      return { isPublic: true };
  }
}
```

### Step 4: Add API Guard Middleware

```typescript
// apps/api/src/middleware/requirePermission.ts
import { hasPermission } from '../services/permissions';

export function requirePermission(permission: string) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as AuthUser;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    if (!hasPermission(user.role, permission)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    next();
  };
}
```

### Step 5: Apply to Route

```typescript
router.get(
  '/newresources',
  authenticate,
  requirePermission('newresource.read'),
  newResourceController.findAll
);
```

### Step 6: Add UI Permission Check

```typescript
// apps/web/src/hooks/usePermission.ts
import { hasPermission } from '@vojas/api-client';

export function usePermission(permission: string) {
  const { data: user } = useCurrentUser();
  if (!user) return false;
  return hasPermission(user.role, permission);
}

// In component
{usePermission('newresource.create') && (
  <Button onClick={openCreateModal}>Create</Button>
)}
```

### Step 7: Write Integration Test

```typescript
it('CONTRACTOR cannot create newresource', async () => {
  const token = await getTokenForRole('CONTRACTOR');
  const res = await api.post('/newresources', { token, body: {} });
  expect(res.status).toBe(403);
});
```

### Step 8: Document in this file and PERMISSIONS.md

---

## Data Scoping Rules

All repository methods MUST apply row-level scoping before returning data. The scoping rules are applied in the Prisma `where` clause and cannot be bypassed by API parameters.

### Rule Map

| Role | Public Data | Own Data | Constituency Data | Org Data | All Data |
|---|---|---|---|---|---|
| ADMIN | ✓ | ✓ | ✓ | ✓ | ✓ |
| OFFICER | ✓ | ✓ | ✓ | ✓ | ✓ |
| MP | ✓ | ✓ | ✓ | — | — |
| CONTRACTOR | ✓ | ✓ | — | ✓ | — |
| CITIZEN | ✓ | ✓ | — | — | — |
| REVIEWER | ✓ | — | ✓ | — | — |

### Scoping in Prisma

```typescript
function buildWhereClause(role: Role, params: QueryParams): Prisma.ProjectWhereInput {
  const base: Prisma.ProjectWhereInput = {
    deletedAt: null,
    ...(params.search && {
      OR: [
        { name: { contains: params.search, mode: 'insensitive' } },
        { description: { contains: params.search, mode: 'insensitive' } },
      ],
    }),
  };

  switch (role) {
    case 'ADMIN':
    case 'OFFICER':
      return base; // no additional filter

    case 'MP':
      return {
        ...base,
        constituencyId: params.constituencyId, // enforced from JWT
      };

    case 'CONTRACTOR':
      return {
        ...base,
        contractorId: params.contractorId, // enforced from JWT
      };

    case 'CITIZEN':
    case 'REVIEWER':
      return {
        ...base,
        visibility: 'public',
      };

    default:
      return {
        ...base,
        visibility: 'public',
      };
  }
}
```

### Field-Level Scoping

Some fields are stripped based on role before sending to client:

```typescript
function sanitizeProject(project: Project, role: Role): SanitizedProject {
  const base = { ...project };

  const hiddenForNonOfficer = ['internalNotes', 'riskScore', 'acbReferral'];
  const hiddenForNonMP = ['internalMpRating'];

  if (!['ADMIN', 'OFFICER'].includes(role)) {
    hiddenForNonOfficer.forEach(k => delete base[k]);
  }
  if (!['ADMIN', 'OFFICER', 'MP'].includes(role)) {
    hiddenForNonMP.forEach(k => delete base[k]);
  }

  return base;
}
```

### Constituency Enforcement

MPs and Officers scoped to constituency are enforced at the JWT level. The `constituencyId` claim is embedded in the token and validated server-side:

```typescript
// JWT payload
{
  sub: 'user-id',
  role: 'MP',
  constituencyId: 'Lok Sabha constituency ID', // always present for MP
  organizationId: null,
}

// Repository — constituencyId is NEVER taken from request params
// It comes ONLY from the authenticated user object
const projects = await prisma.project.findMany({
  where: {
    constituencyId: user.constituencyId, // from token, not req.query
    deletedAt: null,
  },
});
```

### Audit Trail

All permission denials and role-bypass attempts are logged:

```typescript
// apps/api/src/middleware/requirePermission.ts
if (!hasPermission(user.role, permission)) {
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'PERMISSION_DENIED',
      resource: permission,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: { role: user.role, attemptedPermission: permission },
    },
  });
  return res.status(403).json({ error: 'Forbidden' });
}
```

---

## Security Invariants

1. **No client-controlled scoping** — `constituencyId`, `contractorId`, `userId` for scoping come exclusively from the authenticated user object, never from request parameters.
2. **Permission check order** — Authentication → Permission → Scoping → Response. Skipping any step is a vulnerability.
3. **Least privilege by default** — New permissions default to `ADMIN` only.
4. **Audit everything** — All writes (create/update/delete) are audit-logged regardless of role.
5. **Review quarterly** — RBAC matrix should be reviewed each quarter; stale permissions are a risk.
