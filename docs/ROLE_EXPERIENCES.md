# VOJAS Role Experiences

## Overview

VOJAS delivers a tailored experience for each of its 6 user roles. Every role sees a purpose-built dashboard, relevant navigation, and data scoped to their responsibilities. This document maps each role to their experience surface.

---

## Role Comparison Matrix

| Feature | Admin | Officer | MP | Contractor | Citizen | Reviewer |
|---|---|---|---|---|---|---|
| Command Center / Globe | ✓ | ✓ | ✓ | — | — | — |
| All-India Dashboard | ✓ | ✓ | ✓ | — | — | — |
| Constituency Dashboard | — | ✓ | ✓ | — | — | ✓ |
| Project Detail Page | ✓ | ✓ | ✓ | own | public | ✓ |
| Project Time Machine | ✓ | ✓ | ✓ | own | — | — |
| Change Analysis | ✓ | ✓ | ✓ | — | — | — |
| Risk Findings | ✓ | ✓ | ✓ | own | — | ✓ |
| Cases / Investigations | ✓ | ✓ | constituency | own | — | ✓ |
| Reports Management | ✓ | ✓ | constituency | own | own | ✓ |
| Verification Queue | ✓ | ✓ | — | — | — | — |
| Escalation Panel | ✓ | ✓ | ✓ | — | — | — |
| Vendor Directory | ✓ | ✓ | ✓ | own | public | ✓ |
| Financial Tracking | ✓ | ✓ | constituency | own | public | ✓ |
| Satellite Intelligence | ✓ | ✓ | constituency | — | — | — |
| Document Management | ✓ | ✓ | ✓ | own | — | ✓ |
| User Management | ✓ | — | — | — | — | — |
| Audit Logs | ✓ | — | — | — | — | — |
| Notifications | ✓ | ✓ | ✓ | ✓ | ✓ | — |
| Public Transparency Portal | ✓ | — | — | — | ✓ | — |
| Citizen Reporting | — | — | — | — | ✓ | — |
| Follow / Watch | — | — | — | — | ✓ | — |

---

## ADMIN — System Administrator

### Dashboard: `/dashboard`

Full system Command Center with:
- India-wide project heat map (all constituencies)
- Total projects, funding, anomaly counts
- Active officers workload panel
- System health metrics (API latency, DB, satellite job queue)
- Recent escalations requiring admin action
- User management shortcut cards

### Navigation

```
├── Command Center (/)
├── Projects (/projects)
│   ├── All Projects
│   ├── Map View (/projects/map)
│   └── Analytics (/projects/analytics)
├── Risk Engine (/risk)
│   ├── Findings (/risk/findings)
│   ├── Alerts (/risk/alerts)
│   └── Intelligence (/risk/intelligence)
├── Cases (/cases)
├── Verification (/verification)
├── MPs (/mps)
├── Vendors (/vendors)
├── Satellite (/satellite)
├── Financial (/financial)
├── Documents (/documents)
├── Notifications (/notifications)
├── User Management (/admin/users)
├── Audit Logs (/admin/audit)
└── Settings (/admin/settings)
```

### What Admin Sees

- All data across all constituencies — no scoping
- Internal notes and risk scores (hidden from MP/Citizen)
- User management panel: create, assign roles, reset passwords
- Audit log viewer with filters
- System configuration panels
- Escalation override authority

### What Admin Does Not See

- Other admins' sensitive audit logs (segregated)
- Draft-mode features not yet deployed

---

## OFFICER — Verification & Field Operations

### Dashboard: `/dashboard`

Focused operational view:
- Verification queue (pending reports needing officer review)
- Active cases assigned to this officer
- Recent satellite observations in assigned districts
- Anomaly alerts requiring field verification
- Escalation shortcuts
- Constituency quick-stats

### Navigation

```
├── Command Center
├── Projects
├── Risk Engine
│   ├── Findings
│   └── Alerts
├── Cases (/cases)
│   ├── My Cases
│   └── All Cases
├── Verification (/verification)
├── Reports (/reports)
├── Satellite (/satellite)
├── MPs (/mps)
├── Vendors (/vendors)
├── Financial
├── Documents
└── Notifications
```

### What Officer Sees

- Projects across assigned districts
- Full case lifecycle management
- Verification queue with evidence attachment
- Satellite observation overlays on maps
- Internal notes on projects
- Financial details including vouchers
- Escalation path controls

### What Officer Does Not See

- User management (ADMIN only)
- Audit logs (ADMIN only)
- Other officers' personal notes

---

## MP — Member of Parliament

### Dashboard: `/dashboard`

Constituency-centric view:
- Constituency project summary (total, completed, at-risk)
- Funding utilization chart
- Recent citizen reports in constituency
- Risk alerts for constituency projects
- Satellite change summary for constituency
- Quick report generation

### Navigation

```
├── Command Center
│   └── Constituency View
├── Projects (/projects)
│   └── Filtered to own constituency
├── Risk Engine
│   ├── Findings (constituency)
│   └── Alerts (constituency)
├── Cases (constituency)
├── Reports (/reports)
│   ├── My Reports
│   └── Constituency Reports
├── MPs (/mps)
│   └── Own Profile
├── Satellite (/satellite)
│   └── Constituency Overlay
├── Financial (/financial)
│   └── Constituency Finance
├── Documents (/documents)
└── Notifications
```

### What MP Sees

- Only their constituency's projects
- Constituency financial summary
- Citizen reports in their constituency
- Satellite observations for constituency area
- Risk findings scoped to constituency projects
- Exportable constituency report cards
- Follow-up request interface

### What MP Does Not See

- Other constituencies' projects
- Internal officer notes
- User management
- Full audit logs
- Verification queue (MPs do not verify — they escalate)
- Admin panels

---

## CONTRACTOR — Vendor / Contractor

### Dashboard: `/dashboard`

Project-centric view:
- Own active projects
- Milestone progress indicators
- Pending payment requests
- Upcoming deadlines
- Recent feedback from officers/MPs

### Navigation

```
├── My Projects (/projects)
│   └── Filtered to own projects
├── Reports (/reports)
│   └── My Reports
├── Documents (/documents)
│   └── My Documents
├── Financial (/financial)
│   └── My Payments
└── Notifications
```

### What Contractor Sees

- Only their own projects (assigned via `contractorId`)
- Milestone details and deadlines
- Payment request forms and history
- Evidence upload interface
- Feedback from verification officers
- Public project data (read-only)

### What Contractor Does Not See

- Other contractors' projects
- Internal officer notes or risk scores
- Verification queue
- Case management
- Satellite imagery (raw)
- User management
- Financial data beyond own contracts

---

## CITIZEN — General Public

### Experience: Public Transparency Portal

#### Authenticated Citizen

Dashboard: `/dashboard`
- Own submitted reports (status, resolution)
- Followed/watched projects
- Notifications from followed projects
- Public transparency statistics

Navigation:
```
├── Public Projects (/projects)         # public-filtered
├── Project Detail (/projects/:id)       # public data only
├── Report Issue (/report)
├── My Reports (/reports)
├── Transparency (/transparency)
│   ├── India Map
│   ├── Sector Overview
│   └── Financial Summary
└── Notifications                        # own only
```

#### Unauthenticated (Anonymous)

- Full public project listing (`/projects`)
- Public project details (`/projects/:id`)
- Transparency portal (`/transparency`)
- Citizen report form (`/report`) — registers during submission

#### What Citizen Sees (Authenticated)

- Public project data including financial summaries
- Own submitted reports with status tracking
- Follow/watch functionality on projects
- Public risk findings
- Transparency portal with all public data
- Source attribution on all data

#### What Citizen Does Not See

- Internal notes, risk scores, verification flags
- Other citizens' reports
- Unpublished data
- Satellite raw imagery
- Case details
- Vendor internal data
- MP-only reports
- Financial voucher details (only public summaries)

---

## REVIEWER — Audit & Oversight

### Dashboard: `/dashboard`

Read-only oversight view:
- Active cases overview
- Recent verification outcomes
- Escalation statistics
- Financial compliance summary
- Audit metrics

### Navigation

```
├── Command Center
├── Projects (/projects)            # read-only, all
├── Risk Engine (/risk/findings)    # read-only
├── Cases (/cases)                  # read-only
├── Reports (/reports)              # read-only
├── Vendors (/vendors)              # read-only
├── Financial (/financial)          # read-only
├── Satellite (/satellite)          # read-only
├── Documents (/documents)          # read-only
└── Export Tools                    # bulk data export
```

### What Reviewer Sees

- All projects, reports, cases, vendors, financial data (read-only)
- Verification history
- Audit trail
- Bulk export capability for oversight reports
- Risk finding history

### What Reviewer Cannot Do

- Create, update, or delete any record
- Verify or approve
- Escalate or take action
- Access user management
- View internal notes (field excluded server-side)

---

## Role Switching

### How It Works

Users with multiple roles (e.g., ADMIN who is also MP for their constituency) can switch roles from the header:

```
[Avatar ▼] Switch Role: [ADMIN ▼]
```

Role switch:
1. Changes the `role` claim in the active session (not a re-login)
2. Reloads the dashboard to the new role's view
3. Permissions are re-evaluated on every API call
4. Constituency context is preserved if switching between MP and Officer

### UI Enforcement

```typescript
// apps/web/src/hooks/useCurrentRole.ts
export function useCurrentRole() {
  const { data: session } = useSession();
  return session?.user?.role ?? 'CITIZEN';
}

// apps/web/src/components/layout/RoleAwareNav.tsx
const navConfig: Record<Role, NavItem[]> = {
  ADMIN: adminNav,
  OFFICER: officerNav,
  MP: mpNav,
  CONTRACTOR: contractorNav,
  CITIZEN: citizenNav,
  REVIEWER: reviewerNav,
};

export function RoleAwareNav() {
  const role = useCurrentRole();
  return <Nav items={navConfig[role]} />;
}
```

### Session Token

JWT payload after role switch:

```json
{
  "sub": "user-id",
  "role": "MP",           // changed role
  "constituencyId": "LS-12",
  "organizationId": null,
  "originalRole": "ADMIN", // for switch-back
  "exp": 1234567890
}
```

### Switch-Back

A "Return to [original role]" shortcut appears in the header after switching:

```
[Switched to MP — Lok Sabha 12] [← Return to Admin] [Avatar]
```
