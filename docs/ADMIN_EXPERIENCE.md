# VOJAS Admin Experience

## Overview

Administrators have full system access in VOJAS. They manage users and roles, monitor system health, configure data sources, handle multi-tenant settings, review audit logs, and perform emergency overrides. Admin access is granted sparingly and all admin actions are logged.

---

## Admin Dashboard

Route: `/dashboard` (admin-scoped)

```
┌─────────────────────────────────────────────────────────────┐
│  VOJAS Admin Console                         [System] [⚙]    │
│  System Health: ● Healthy    Last sync: 2 min ago           │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Total       │  Active      │  Reports     │  System      │
│  Users       │  Officers    │  Today       │  Uptime      │
│    1,247     │      89      │     342      │  99.97%      │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                                                             │
│  Active Sessions    │  API Latency (24h)    │  Storage      │
│  234 online         │  [📈 chart]          │  47.3 GB      │
│                     │  p50: 45ms            │  73% used    │
│                     │  p99: 180ms           │              │
├─────────────────────┴───────────────────────┴──────────────┤
│  Alert Feed                                                │
│  ───────────                                                │
│  🔴 Satellite job queue backed up (12 pending)  5 min ago  │
│  🟡 3 users locked due to failed login         20 min ago  │
│  🟢 New MP onboarded: Lok Sabha 23             1 hour ago   │
│  🟢 15 projects geo-coded from new import      2 hours ago  │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation

```
Admin Nav
├── Dashboard (/dashboard)          # system overview
├── System Monitor (/admin/monitor)
│   ├── API Health
│   ├── Database Status
│   ├── Job Queues
│   ├── Storage
│   └── Logs
├── Users (/admin/users)
│   ├── All Users
│   ├── Pending Approval
│   ├── Locked Accounts
│   └── Role Assignment
├── Roles (/admin/roles)
│   ├── Role Matrix
│   └── Permission Editor
├── Audit Logs (/admin/audit)
│   ├── All Actions
│   ├── Permission Denials
│   └── Escalations
├── Data Sources (/admin/data)
│   ├── Source Status
│   ├── Import History
│   └── Sync Controls
├── Security (/admin/security)
│   ├── Login Attempts
│   ├── API Keys
│   └── Session Management
├── Multi-Tenant (/admin/tenant)
│   ├── Constituencies
│   └── Organization Management
└── Settings (/admin/settings)
    ├── Notifications
    ├── Integrations
    └── Maintenance Mode
```

---

## User Management

### Create User

```typescript
// POST /admin/users
{
  "name": "Rajesh Kumar",
  "email": "rajesh.kumar@vojas.in",
  "role": "OFFICER",
  "constituencyId": "LS-12",        // for MP
  "organizationId": null,           // for CONTRACTOR
  "permissions": ["custom-permission"],  // optional extensions
  "notifyOnCreate": true,
  "sendWelcomeEmail": true,
}
```

### Role Assignment

```typescript
// PUT /admin/users/:id/role
{
  "role": "OFFICER",
  "constituencyIds": ["LS-12", "LS-15"],  // assigned constituencies
  "effectiveUntil": "2027-03-31",         // temporary assignment
  "reason": "Field operations for monsoon season",
}
```

### Role Matrix Editor

Admin can view and audit the role-permission matrix:

```
┌──────────────────────────────────────────────────────────────┐
│  Role Permission Matrix                         [Export CSV] │
├──────────────────────────────────────────────────────────────┤
│  Resource    │ Create │ Read │ Update │ Delete │ Verify     │
│  ────────────┼────────┼──────┼────────┼────────┼────────── │
│  Project     │  A O   │  *   │  A O   │   A    │   A O     │
│  Report      │  O M C │  *   │  O M   │  A O   │   A O     │
│  Finding     │  A O   │  *   │  A O   │   A    │   A O     │
│  Case        │  A O   │ AMOR │  A O   │   A    │   A O     │
│  User        │   A    │  A   │   A    │   A    │    —      │
│  Audit       │   —    │  A   │   —    │   —    │    —      │
│                                                              │
│  Legend: A=ADMIN O=OFFICER M=MP C=CONTRACTOR R=REVIEWER    │
└──────────────────────────────────────────────────────────────┘
```

---

## System Monitoring

### Health Metrics

| Metric | Current | Status | Threshold |
|---|---|---|---|
| API Response (p50) | 45ms | Green | < 100ms |
| API Response (p99) | 180ms | Yellow | < 500ms |
| Database connections | 23/100 | Green | < 80 |
| Satellite job queue | 12 pending | Yellow | > 50 |
| Disk usage | 73% | Green | < 85% |
| Memory usage | 58% | Green | < 80% |
| Error rate | 0.3% | Green | < 2% |
| Last successful sync | 2 min ago | Green | < 15 min |

### Job Queue Monitor

```typescript
// apps/api/src/controllers/adminController.ts
router.get('/admin/jobs', authenticate, requirePermission('admin.system'), async (req, res) => {
  const jobs = await jobQueue.getStats();
  res.json({
    satellite: { pending: 12, running: 3, failed: 1, avgTime: '4m 20s' },
    changeAnalysis: { pending: 5, running: 1, failed: 0, avgTime: '12m' },
    geocoding: { pending: 0, running: 0, failed: 2, avgTime: '8s' },
    reportGeneration: { pending: 3, running: 2, failed: 0, avgTime: '2m' },
  });
});
```

---

## Audit Log Review

### Accessing Audit Logs

Route: `/admin/audit`

```typescript
// apps/api/src/controllers/auditController.ts
router.get('/admin/audit', authenticate, requirePermission('audit.read'), async (req, res) => {
  const { userId, action, resourceType, from, to, page } = req.query;

  const logs = await prisma.auditLog.findMany({
    where: {
      ...(userId && { userId }),
      ...(action && { action }),
      ...(resourceType && { resourceType }),
      ...(from && { createdAt: { gte: new Date(from as string) } }),
      ...(to && { createdAt: { lte: new Date(to as string) } }),
    },
    include: { user: { select: { name: true, role: true } } },
    orderBy: { createdAt: 'desc' },
    take: 50,
    skip: (Number(page) - 1) * 50,
  });

  res.json({ data: logs });
});
```

### Audit Log Entry Schema

```typescript
interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: Role;
  action: AuditAction;
  resourceType: 'Project' | 'Report' | 'Case' | 'User' | 'Finding' | 'Document';
  resourceId?: string;
  ip: string;
  userAgent: string;
  metadata: Record<string, unknown>;  // action-specific data
  createdAt: Date;
}

type AuditAction =
  | 'CREATE' | 'UPDATE' | 'DELETE'
  | 'REPORT_VERIFIED' | 'REPORT_REJECTED'
  | 'CASE_OPENED' | 'CASE_CLOSED' | 'CASE_ESCALATED'
  | 'USER_CREATED' | 'USER_ROLE_CHANGED' | 'USER_LOCKED'
  | 'PERMISSION_DENIED'
  | 'LOGIN_SUCCESS' | 'LOGIN_FAILED'
  | 'DATA_EXPORT' | 'BULK_IMPORT'
  | 'SYSTEM_CONFIG_CHANGED'
  | 'ESCALATION_SUBMITTED';
```

### Permission Denial Tracking

```typescript
// Every permission denial is logged
await prisma.auditLog.create({
  data: {
    userId: user.id,
    action: 'PERMISSION_DENIED',
    resourceType: 'Permission',
    metadata: {
      attemptedPermission: permission,
      role: user.role,
      route: req.path,
      method: req.method,
    },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

Admin reviews permission denials to:
- Detect potential security probing
- Identify missing permissions for legitimate use cases
- Audit role assignments

---

## Security Panel

### Failed Login Monitor

```typescript
// apps/api/src/services/authService.ts
// After 5 failed logins in 15 minutes, lock account
if (failedCount >= 5) {
  await prisma.user.update({
    where: { id: user.id },
    data: { lockedUntil: new Date(Date.now() + 30 * 60 * 1000) }, // 30 min lock
  });
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'USER_LOCKED',
      metadata: { reason: 'Too many failed login attempts', failedCount },
    },
  });
}
```

### API Key Management

```typescript
// POST /admin/api-keys
{
  "name": "Satellite Ingestion Service",
  "permissions": ['satellite.read', 'satellite.analyze'],
  "expiresAt": "2027-01-01",
  "rateLimit": 1000,        // requests per hour
  "ipWhitelist": ['10.0.0.0/8'],
}
```

---

## Emergency Override

Admin can perform emergency overrides:

```typescript
// POST /admin/override
{
  "action": "ESCALATION_BYPASS" | "DATA_UNDELETE" | "USER_UNLOCK" | "PERMISSION_GRANT",
  "targetId": "resource-or-user-id",
  "reason": "Emergency: Project stalled for 2 years, bypassing escalation queue",
  "notifyOnAction": true,     // notify the MP and officer
  "approvalReference": "ADM-2026-0097",  // internal ticket reference
}
```

All overrides require:
1. A reason (mandatory, min 20 characters)
2. An approval reference (internal ticket)
3. Notification to affected parties
4. Entry in audit log with `EMERGENCY_OVERRIDE` action type

---

## Data Import Management

```typescript
// POST /admin/data/import
{
  "source": "MOSPI" | "PFMS" | "LGD" | "CDSE",
  "type": "PROJECTS" | "CONSTITUENCIES" | "VENDORS" | "SATELLITE",
  "file": "https://...",
  "dryRun": true,         // validate first
  "notifyOnComplete": true,
}

// Validation report before commit
{
  "totalRows": 5000,
  "validRows": 4973,
  "errors": [
    { row: 142, field: "projectId", error: "Duplicate key" },
    { row: 891, field: "constituencyId", error: "Invalid reference" },
  ],
  "warnings": [
    { row: 234, field: "budget", warning: "Budget changed by >50%" },
  ],
}
```

---

## Multi-Tenant Management

### Constituency Configuration

```typescript
// PUT /admin/tenant/constituencies/:id
{
  "name": "Lok Sabha 12 — Bangalore North",
  "active": true,
  "mpUserId": "user-uuid",
  "officerIds": ["officer-uuid-1", "officer-uuid-2"],
  "dataSources": ["MOSPI", "PFMS", "CDSE"],
  "alertsEnabled": true,
  "autoEscalation": true,     // auto-escalate critical findings
}
```

### System-Wide Settings

```typescript
// PUT /admin/settings/system
{
  "maintenanceMode": false,
  "newUserApprovalRequired": true,
  "publicDataEnabled": true,
  "satelliteAutoAnalysis": true,
  "riskEngineEnabled": true,
  "changeAnalysisSchedule": "0 2 * * *",  // cron: 2 AM daily
  "dataRetentionDays": 365 * 7,           // 7 years
  "auditRetentionDays": 365 * 10,         // 10 years
}
```

---

## Security Boundaries

Admin CANNOT:
- See other admins' passwords (hashed, immutable)
- Bypass data retention policies without audit
- Access citizen report identity data beyond role scope
- Disable all audit logging
- Assign themselves permissions not in ADMIN role
- Delete audit logs (only ADMIN can archive)
- Bypass constituency scoping for MPs they don't own (if dual-role)

All admin actions are logged to a separate, append-only audit store.
