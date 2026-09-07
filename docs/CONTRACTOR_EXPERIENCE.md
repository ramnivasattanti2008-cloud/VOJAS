# VOJAS Contractor Experience

## Overview

Contractors (vendors/organizations awarded MPLAD projects) use VOJAS to manage their assigned projects, update milestone progress, submit documents, track payment status, and respond to citizen reports. Contractors see ONLY their own projects — no competitor data, no internal officer notes.

---

## Contractor Dashboard

Route: `/dashboard`

```
┌─────────────────────────────────────────────────────────────┐
│  Contractor Dashboard                         [Logout]       │
│  ABC Constructions Pvt Ltd                                  │
├──────────────┬──────────────┬──────────────┬────────────────┤
│  Active      │  Completed   │  Pending     │  Payment       │
│  Projects    │  This Year   │  Milestones  │  Outstanding   │
│     5        │      3       │      8       │  Rs 2.3 Cr     │
├──────────────┴──────────────┴──────────────┴────────────────┤
│                                                             │
│  Upcoming Milestones (next 30 days)                        │
│  ─────────────────────────────────────                     │
│  ⚠ Road - Hegdenagar to Byadarahalli                      │
│    Milestone: Phase 2 Completion          Due: 2026-09-15 │
│    Progress: 65%                    [Update Progress]     │
│                                                             │
│  ⚠ School Renovation — JP Nagar                           │
│    Milestone: Civil Work Completion        Due: 2026-09-20 │
│    Progress: 40%                    [Update Progress]     │
│                                                             │
│  Anganwadi Centre — Whitefield                             │
│    Milestone: Foundation Work              Due: 2026-10-01 │
│    Progress: 20%                    [Update Progress]     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Recent Citizen Reports          │  Payment Status          │
│  ─────────────────────          │  ──────────────           │
│  📍 Road Hegdenagar:             │  Invoice #INV-2026-045   │
│    "Drain work incomplete"       │  Amount: Rs 12.5L        │
│    Status: Under Review          │  Status: Approved        │
│    [View & Respond]              │  Expected: 2026-09-10    │
│                                 │                          │
│  📍 School JP Nagar:              │  Invoice #INV-2026-038   │
│    "Materials on road"           │  Amount: Rs 8.2L          │
│    Status: Verified              │  Status: Pending Review  │
│    [View Response]               │  [Track]                 │
├─────────────────────────────────┴──────────────────────────┤
│  Notifications (3 unread)                  [View All]       │
│  • Payment approved for Project #42                       │
│  • New citizen report on Road project                      │
│  • Document verification complete                           │
└─────────────────────────────────────────────────────────────┘
```

---

## Navigation

```
Contractor Nav
├── My Dashboard (/dashboard)
├── My Projects (/projects)       # own projects only
│   ├── Project List
│   └── Project Detail (/projects/:id)
├── My Reports (/reports)         # reports on own projects
│   ├── Citizen Reports
│   └── My Responses
├── Documents (/documents)        # own documents
│   ├── Upload
│   ├── Verification Status
│   └── Templates
├── Financial (/financial)        # own invoices/payments
│   ├── Invoices
│   ├── Payment Status
│   └── Submit Invoice
└── Notifications
```

---

## Project Management

### Scope Enforcement

Contractors see only projects where `contractorId` matches their organization:

```typescript
// apps/api/src/repositories/projectRepository.ts
export async function findAllForContractor(organizationId: string, params: QueryParams) {
  return prisma.project.findMany({
    where: {
      contractorId: organizationId,
      deletedAt: null,
    },
    // No constituency filter — contractor sees all their projects across constituencies
  });
}
```

### Project Detail Page (Contractor View)

Tabs available to contractor:

| Tab | Content |
|---|---|
| Overview | Project details, scope, timeline, sector |
| Milestones | All milestones with progress tracking |
| Financial | Invoice history, payment status, submitted bills |
| Documents | Uploaded documents, verification status |
| Reports | Citizen reports on this project, contractor responses |
| Evidence | Evidence uploads (site photos, completion certificates) |

Tabs NOT shown to contractor:
- Internal Officer Notes
- Verification Queue
- Risk Scores (internal)
- ACB Referral status
- Satellite raw imagery (can see change summaries only)

### Milestone Update

```typescript
// PUT /projects/:id/milestones/:milestoneId
{
  "progress": 75,                    // 0-100
  "status": "IN_PROGRESS",           // NOT_STARTED | IN_PROGRESS | COMPLETED | DELAYED
  "notes": "Phase 2 drainage work completed",
  "evidence": [
    {
      "type": "SITE_PHOTO",
      "url": "https://storage.vojas.in/evidence/...",
      "capturedAt": "2026-09-06T10:00:00Z",
      "description": "Drainage work phase 2 completion photo",
    },
  ],
  "delayed": false,
  "delayReason": null,               // required if delayed = true
  "estimatedCompletion": "2026-09-15",
}
```

---

## Invoice / Payment Workflow

### Submit Invoice

```typescript
// POST /financial/invoices
{
  "projectId": "project-uuid",
  "milestoneId": "milestone-uuid",
  "invoiceNumber": "ABC/2026/045",
  "amount": 12_50_000,              // Rs 12.5 lakhs
  "gstAmount": 2_25_000,
  "totalAmount": 14_75_000,
  "description": "Phase 2 — Road construction materials and labor",
  "documents": [
    {
      "type": "INVOICE",
      "url": "https://storage.vojas.in/docs/invoice-abc-045.pdf",
    },
    {
      "type": "BILL_OF_MATERIALS",
      "url": "https://storage.vojas.in/docs/bom-phase2.pdf",
    },
    {
      "type": "LABOUR_ROSTER",
      "url": "https://storage.vojas.in/docs/labour-roster.pdf",
    },
  ],
  "bankDetails": {
    "accountNumber": "XXXXXXXX1234",
    "ifsc": "SBIN0001234",
    "bankName": "State Bank of India",
    "accountHolder": "ABC Constructions Pvt Ltd",
  },
}
```

### Invoice Status Flow

```
┌────────────┐   submit   ┌─────────────┐  approve  ┌───────────┐
│  DRAFT     │───────────→│  SUBMITTED  │─────────→│  REVIEW   │
└────────────┘            └─────────────┘          └─────┬─────┘
                                                         │
                      ┌──────────────────────────────────┤
                      ▼                   ▼             ▼
               ┌───────────┐       ┌───────────┐  ┌───────────┐
               │ APPROVED  │       │  REJECTED │  │ QUERIED   │
               └─────┬─────┘       └───────────┘  └───────────┘
                     │                                      │
                     ▼                                      │
              ┌────────────┐                                │
              │  PAYMENT   │←───────────────────────────────┘
              │  SCHEDULED │          re-submit
              └─────┬──────┘
                    │
                    ▼
              ┌───────────┐
              │  PAID     │
              └───────────┘
```

### Payment Tracking

Contractors can see:
- Invoice submission date
- Current status
- Approval/rejection notes
- Expected payment date
- Actual payment date (once paid)
- Payment reference number

Contractors CANNOT see:
- Internal approval chain details
- Officer reviewer notes
- Other contractors' invoices

---

## Document Management

### Upload Documents

```typescript
// POST /documents
{
  "projectId": "project-uuid",
  "type": "COMPLETION_CERTIFICATE" | "BILL_OF_QUANTITIES" | "SITE_PHOTO" |
          "APPROVAL_LETTER" | "ESTIMATE" | "CONTRACT" | "MISC",
  "name": "Phase 2 Completion Certificate",
  "url": "https://storage.vojas.in/docs/completion-phase2.pdf",
  "category": "MILESTONE_EVIDENCE" | "FINANCIAL" | "ADMINISTRATIVE" | "LEGAL",
}
```

### Document Verification

Documents uploaded by contractors go through verification:

| Status | Description |
|---|---|
| `PENDING` | Awaiting officer review |
| `UNDER_REVIEW` | Officer is reviewing |
| `VERIFIED` | Approved by officer |
| `REJECTED` | Rejected with reason |
| `QUERIED` | Officer has questions |

---

## Responding to Citizen Reports

When a citizen reports an issue on a contractor's project, the contractor can:

```typescript
// POST /reports/:id/respond
{
  "response": "The incomplete drain work was due to unexpected underground utility lines. We have now completed the work and attached photographic evidence.",
  "evidence": [
    {
      "type": "SITE_PHOTO",
      "url": "https://storage.vojas.in/evidence/completion-photo.jpg",
      "description": "Completed drain work — photo taken 2026-09-05",
    },
  ],
  "milestoneReference": "milestone-uuid",  // optional
}
```

Response is visible to:
- Reporting citizen
- MP of constituency
- Verification officer
- NOT visible publicly until verified

---

## Security Boundaries

Contractors CANNOT:
- See other contractors' projects or data
- Access satellite raw imagery
- See internal officer notes
- Access verification queue
- Open or close cases
- View risk scores
- Access ACB/CAG referral data
- Access audit logs
- Manage users
- Export bulk data
- Access non-own project data

Contractors CAN:
- Manage their own projects and milestones
- Submit invoices and track payments
- Upload documents and evidence
- Respond to citizen reports on their projects
- View public project data (read-only)
- Escalate concerns about their projects
- Access their own financial data
- Export their own project data
