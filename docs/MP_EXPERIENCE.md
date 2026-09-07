# VOJAS MP Experience

## Overview

Members of Parliament use VOJAS to monitor all MPLAD (Member of Parliament Local Area Development) projects within their constituency, review citizen reports, access satellite evidence, track financial utilization, and escalate concerns to appropriate authorities.

---

## Constituency Dashboard

Route: `/dashboard`

The MP dashboard is scoped exclusively to the MP's assigned constituency.

### Dashboard Widgets

```
┌─────────────────────────────────────────────────────────────┐
│  Lok Sabha 12 — Bangalore North                            │
│  Welcome, Hon. MP Name           [Switch Role] [Logout]    │
├──────────────┬──────────────┬──────────────┬──────────────┤
│   Projects   │   Funding    │  At Risk     │   Pending    │
│     247      │ Rs 124.5 Cr  │     18        │   Reports    │
│   +12 this   │ 78% utilized │  [View All]  │     34       │
│   quarter    │              │              │  [Review]    │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                                                             │
│  [═══════════════════════════════════════════════] 82%     │
│  Overall Progress                            ┌──────────┐ │
│                                               │ Constit. │ │
│                                               │ Choropleth│ │
│                                               │   Map    │ │
│                                               └──────────┘ │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Recent Reports          │  Satellite Alerts              │
│  ─────────────────       │  ────────────────              │
│  ⚠ Road #42 incomplete   │  🔴 Change detected: Project  │
│  ⚠ School renovation     │     #189 — No progress since   │
│    delayed 6 months       │     March 2026 (satellite)     │
│  ⚠ Water supply halt      │                                │
├───────────────────────────┴────────────────────────────────┤
│  Financial Summary          │  Risk Highlights             │
│  ─────────────────          │  ──────────────              │
│  Total: Rs 124.5 Cr         │  HIGH: 3 projects stalled     │
│  Released: Rs 102.1 Cr      │  MED:  15 cost overruns      │
│  Utilized: Rs 89.7 Cr       │  LOW:   47 minor delays       │
│  Utilization: 87.8%         │                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Source

```typescript
// apps/api/src/repositories/projectRepository.ts
export async function findMpDashboardData(constituencyId: string) {
  const [projects, financial, reports, riskFindings] = await Promise.all([
    prisma.project.findMany({
      where: { constituencyId, deletedAt: null },
      select: { id: true, status: true, progress: true, sector: true },
    }),
    prisma.financialRecord.aggregate({
      where: { project: { constituencyId }, deletedAt: null },
      _sum: { allocatedAmount: true, releasedAmount: true, utilizedAmount: true },
    }),
    prisma.report.count({
      where: { project: { constituencyId }, status: { in: ['REPORTED', 'ESCALATED'] } },
    }),
    prisma.finding.count({
      where: { project: { constituencyId }, severity: 'HIGH', status: 'OPEN' },
    }),
  ]);
  return { projects, financial, reports, riskFindings };
}
```

---

## Navigation

```
MP Nav
├── Command Center (/dashboard)
├── Projects (/projects)         # constituency-scoped
│   ├── All Projects
│   ├── Map View (/projects/map)  # constituency view
│   ├── Time Machine (/projects/:id/time-machine)
│   └── Analytics
├── Risk Engine
│   ├── Findings (/risk/findings)   # constituency findings
│   ├── Alerts (/risk/alerts)       # constituency alerts
│   └── Intelligence (/risk/intelligence)
├── Cases (/cases)              # constituency cases
├── Reports (/reports)          # constituency + own
├── Satellite (/satellite)      # constituency imagery
├── Financial (/financial)      # constituency finances
├── Documents (/documents)     # constituency documents
├── MPs (/mps/:id)             # own profile
└── Notifications
```

---

## Project Monitoring

### Project List

All projects filtered to MP's constituency:

```typescript
// apps/api/src/controllers/projectController.ts
router.get(
  '/projects',
  authenticate,
  requirePermission('project.read'),
  async (req, res) => {
    const user = req.user as AuthUser;
    // constituencyId comes from token, never from req
    const projects = await projectRepository.findAll({
      role: user.role,
      constituencyId: user.constituencyId, // enforced
      search: req.query.search as string,
      status: req.query.status as ProjectStatus,
      page: Number(req.query.page) || 1,
    });
    res.json({ data: projects.data, pagination: projects.pagination });
  }
);
```

### Project Detail

Each project shows MP-relevant tabs:

| Tab | Content |
|---|---|
| Overview | Basic info, status, progress, sector |
| Financial | Budget allocation, releases, utilization |
| Satellite | Satellite observations, time machine |
| Change Analysis | Change detection history |
| Reports | Citizen reports in constituency |
| Documents | Official documents |
| Risk | Risk findings for this project |
| Timeline | Activity history |

### Time Machine Access

MPs can access the full time machine for any constituency project:
- Before/after satellite comparison
- Side-by-side and swipe view
- Playback through time
- Export comparison report

```typescript
// MP permission for time machine
export const ROLE_PERMISSION_MAP = {
  MP: new Set([
    'project.read', 'project.escalate', 'project.export',
    // ... time machine is read access on project
  ]),
};
```

---

## Citizen Report Review

### Reports Dashboard

Route: `/reports`

Shows:
- All reports for constituency projects
- Own submitted reports
- Filter by: status, project, sector, severity, date range

### Report Actions

| Action | When Available | Effect |
|---|---|---|
| View Details | always | Full report with evidence |
| Add Note | always | Attach MP note (internal) |
| Request Update | `VERIFIED` report | Ask officer for status update |
| Escalate | any status | Send to higher authority |
| Forward to Officer | `REPORTED` status | Direct to verification queue |
| Generate Report | always | Export constituency report PDF |

### Escalation from MP

```typescript
// POST /reports/:id/escalate
{
  "escalateTo": "ACB" | "CAG" | "LOKAYUKTA" | "OFFICER",
  "reason": "Repeated delays despite verified evidence of fund utilization",
  "priority": "HIGH" | "CRITICAL",
  "attachDocuments": ["doc-id-1", "doc-id-2"],
}
```

---

## Report Generation

MPs can generate three types of reports:

### 1. Constituency Status Report

Monthly summary:
- Total projects: active, completed, at-risk
- Financial utilization
- Top issues
- Risk summary
- Satellite change summary

### 2. Project-Specific Report

For any single project:
- Full project details
- Financial breakdown
- Citizen report history
- Satellite evidence
- Officer verification history
- Risk findings

### 3. Investigation Report

For escalated issues:
- Case details
- Evidence chain
- Officer findings
- Satellite confirmation
- Recommended action

```typescript
// apps/api/src/controllers/reportController.ts
router.post(
  '/reports/generate',
  authenticate,
  requirePermission('report.export'),
  async (req, res) => {
    const { type, projectId, constituencyId, format } = req.body;
    const user = req.user as AuthUser;

    const report = await reportGenerator.generate({
      type,
      projectId,
      constituencyId: user.constituencyId,
      format: format ?? 'PDF',
      generatedBy: user.id,
    });

    res.json({ data: report });
  }
);
```

---

## Financial Tracking

### Constituency Finance View

- Total MPLAD allocation
- Release schedule
- Utilization by sector
- Comparison with DPR estimates
- Flagged anomalies (cost overruns, delayed payments)

### Financial Alerts

MPs receive alerts for:
- Utilization < 50% by mid-year
- Cost overruns > 20%
- Payment delays > 90 days
- Vendor payment disputes

---

## Security Boundaries

MPs CANNOT:
- Verify reports (only escalate)
- Open or close cases
- Access officer notes or internal flags
- See other constituencies' data
- Modify any record
- Access user management
- See ACB referral details
- View audit logs
- Bypass constituency scoping

MPs CAN:
- Read all constituency project data
- Escalate to any authority level
- Submit reports
- Generate reports
- Access satellite imagery for constituency
- Review and comment on findings
- Follow/watch projects
