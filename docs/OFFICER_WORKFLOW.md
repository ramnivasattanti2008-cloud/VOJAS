# VOJAS Officer Workflow

## Overview

Officers are the investigative backbone of VOJAS. They verify citizen reports, manage investigation cases, analyze satellite evidence, and escalate findings to higher authorities (MPs, ACB, CAG). This document covers the complete officer operational workflow.

---

## Officer Responsibilities

| Area | Tasks |
|---|---|
| Report Verification | Triage incoming reports, verify evidence, mark as credible/false/inconclusive |
| Case Management | Open, investigate, update, and close investigation cases |
| Satellite Evidence | Review satellite observations, correlate with project data |
| Risk Findings | Review auto-generated findings, mark reviewed, escalate |
| Escalations | Handle escalated items from MPs and Citizens, route to appropriate authority |
| Field Operations | Attach field notes, photos, GPS evidence to records |

---

## Case Lifecycle

```
┌──────────┐    escalate    ┌──────────┐   open case   ┌──────────┐
│ Report   │───────────────→│ Escalate │───────────────→│ Case     │
│ Created  │                │ Queue    │                │ Opened   │
└──────────┘                └──────────┘                └────┬─────┘
                                                            │
                     ┌───────────────────────────────────────┤
                     │                                       │
                     ▼                                       ▼
              ┌────────────┐                          ┌────────────┐
              │ Under      │   evidence sufficient    │ Ready for  │
              │ Investigation│───────────────────────→│ Action     │
              └─────┬──────┘                          └─────┬──────┘
                    │                                         │
                    ▼                                         ▼
             ┌────────────┐                           ┌───────────┐
             │ Evidence   │                           │ Action    │
             │ Insufficient│←─────────────────────────│ Taken     │
             └────────────┘  no change in 90 days     └─────┬─────┘
                                                            │
                         ┌─────────────────────────────────┤
                         ▼                   ▼             ▼
                  ┌────────────┐     ┌───────────┐  ┌───────────┐
                  │ Closed -   │     │ Referred  │  │ Forwarded │
                  │ Resolved    │     │ to ACB    │  │ to CAG    │
                  └────────────┘     └───────────┘  └───────────┘
```

### Status Definitions

| Status | Description | Who Can Set |
|---|---|---|
| `REPORTED` | New report submitted | Citizen, MP, Officer |
| `ESCALATED` | Flagged for investigation | Officer, MP |
| `VERIFIED` | Evidence confirmed | Officer |
| `FALSE` | Report disproven | Officer |
| `INCONCLUSIVE` | Cannot determine | Officer |
| `CASE_OPENED` | Investigation started | Officer |
| `UNDER_INVESTIGATION` | Active investigation | Officer |
| `EVIDENCE_SUFFICIENT` | Ready for action | Officer |
| `ACTION_TAKEN` | Resolution implemented | Officer |
| `CLOSED_RESOLVED` | Case closed, resolved | Officer |
| `CLOSED_UNRESOLVED` | Case closed, no resolution | Officer |
| `REFERRED_ACB` | Referred to Anti-Corruption Bureau | Officer |
| `REFERRED_CAG` | Referred to Comptroller | Officer |
| `REFERRED_POLICE` | Referred to Law Enforcement | Officer |
| `ARCHIVED` | Archived for records | Officer, Admin |

---

## Verification Steps

### Step 1: Access Verification Queue

Route: `GET /verification/queue`

```typescript
// apps/api/src/controllers/verificationController.ts
router.get(
  '/verification/queue',
  authenticate,
  requirePermission('verification.queue'),
  verificationController.getQueue
);
```

Queue shows all reports needing officer review, sorted by:
1. Severity (high → low)
2. Age (oldest first within severity)
3. Constituency priority flag

### Step 2: Review Report Details

```typescript
interface QueueItem {
  id: string;
  type: 'REPORT' | 'SATELLITE' | 'FINANCIAL' | 'ANOMALY';
  projectId: string;
  projectName: string;
  constituencyId: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  submittedBy: string;
  submittedAt: string;
  evidenceCount: number;
  linkedReports: number;
  riskScore?: number;
}
```

### Step 3: Attach Evidence

Officers can attach field evidence to any report:

```typescript
// POST /reports/:id/evidence
{
  "type": "FIELD_PHOTO" | "GPS_COORDINATE" | "FIELD_NOTE" | "OFFICIAL_DOCUMENT",
  "url": "https://storage.vojas.in/evidence/...",
  "description": "On-site photo of incomplete drain work",
  "capturedAt": "2026-09-06T10:30:00Z",
  "capturedBy": "officer-id",
  "latitude": 12.9716,
  "longitude": 77.5946,
}
```

### Step 4: Verification Decision

```typescript
// POST /reports/:id/verify
{
  "decision": "VERIFIED" | "FALSE" | "INCONCLUSIVE",
  "notes": "Evidence confirms construction was not completed as per DPR",
  "linkedCaseId?: "case-id",  // optionally open a case
  "severityAdjustment?: "HIGH", // adjust if warranted
  "escalateTo?: "ACB" | "CAG" | "LOKAYUKTA" | "MP",
}
```

### Step 5: Audit Trail

Every verification action is automatically logged:

```typescript
await prisma.auditLog.create({
  data: {
    userId: officer.id,
    action: 'REPORT_VERIFIED',
    resourceType: 'Report',
    resourceId: reportId,
    metadata: {
      decision: 'VERIFIED',
      severityAdjustment: 'HIGH',
      linkedCaseId: caseId ?? null,
    },
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  },
});
```

---

## Escalation Path

### Level 1: Officer Review
- Initial triage and verification
- Duration target: 48 hours

### Level 2: Officer Escalation
- Flagged for senior officer review
- Route: `/escalations` queue
- Duration target: 72 hours

### Level 3: MP Notification
- MP of affected constituency is notified
- Route: `/notifications` + email
- MP can review and forward

### Level 4: Law Enforcement

| Trigger | Route | Authority |
|---|---|---|
| Procurement fraud > Rs 50L | `REFERRED_ACB` | Anti-Corruption Bureau |
| Fund diversion | `REFERRED_CAG` | Comptroller & Auditor General |
| Criminal negligence | `REFERRED_POLICE` | State Police |
| Government official involvement | `REFERRED_LOKAYUKTA` | Lokayukta |

### Escalation Auto-Trigger Rules

```typescript
// apps/api/src/services/escalationEngine.ts
const ESCALATION_RULES: EscalationRule[] = [
  {
    name: 'High-Value Fraud',
    condition: (finding) =>
      finding.type === 'FINANCIAL_ANOMALY' &&
      finding.estimatedLoss >= 50_00_000, // Rs 50L
    target: 'ACB',
    urgency: 'CRITICAL',
    autoEscalate: true,
  },
  {
    name: 'Safety Violation',
    condition: (finding) =>
      finding.type === 'SAFETY_VIOLATION' &&
      finding.severity === 'HIGH',
    target: 'MP',
    urgency: 'HIGH',
    autoEscalate: false, // officer review first
  },
  {
    name: 'Repeated Non-Compliance',
    condition: (finding) =>
      finding.type === 'NON_COMPLIANCE' &&
      finding.project.repeatOffense === true,
    target: 'LOKAYUKTA',
    urgency: 'HIGH',
    autoEscalate: true,
  },
  {
    name: 'Satellite-Confirmed Stalled Work',
    condition: (finding) =>
      finding.type === 'STALLED_PROJECT' &&
      finding.satelliteConfirmed === true &&
      finding.daysStalled >= 180,
    target: 'MP',
    urgency: 'MEDIUM',
    autoEscalate: true,
  },
];
```

---

## Officer Daily Workflow

```
Morning (9:00 AM)
├── Check verification queue — new items since yesterday
├── Review satellite alerts for assigned districts
├── Check escalation notifications
└── Prioritize queue by severity

Mid-Morning (10:00 AM – 1:00 PM)
├── Process verification queue items (3-5 reports)
├── Attach field evidence to active cases
├── Update case progress notes
└── Review auto-generated findings

Afternoon (2:00 PM – 5:00 PM)
├── Follow up on pending cases
├── Correspond with MPs on escalated items
├── Document field visits and evidence
└── Submit daily summary

End of Day (5:00 PM)
├── Update case status flags
├── Flag urgent items for next morning
└── Clear notification queue
```

---

## Key Metrics

| Metric | Target | Alert Threshold |
|---|---|---|
| Queue items pending > 48h | 0 | > 5 items |
| Average verification time | < 48h | > 72h avg |
| Case closure rate (90 days) | > 80% | < 60% |
| Escalation response time | < 24h | > 48h |
| Evidence attachment rate | > 70% of verifications | < 50% |
