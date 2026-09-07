# VOJAS Citizen Experience

## Overview

Citizens are the eyes and ears of VOJAS. They can explore public project data, submit reports about issues with MPLAD projects, track the status of their reports, follow projects they care about, and access the public transparency portal. No login required for public data; login required for reporting and tracking.

---

## Two Experience Tiers

### Unauthenticated (Anonymous)

- All public project data
- Transparency portal
- Citizen report form (creates account during submission)
- Public dashboards and analytics

### Authenticated Citizen

- All public data (same as unauthenticated)
- Personal report tracking
- Follow / watch projects
- Notification preferences
- Profile management

---

## Public Transparency Portal

Route: `/transparency`

### India-Wide View

```
┌─────────────────────────────────────────────────────────────┐
│  VOJAS — Public Accountability Platform                    │
│  Making MPLAD Projects Transparent for Every Citizen        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   [══════════════ INDIA MAP — CHOROPLETH ═══════════════]  │
│   Color: Project completion rate by constituency            │
│   Hover: Constituency name + stats                          │
│   Click: Navigate to constituency page                      │
│                                                             │
├──────────────┬──────────────┬──────────────┬──────────────┤
│  Projects    │  Total       │  At Risk     │  Completed   │
│  Tracked     │  Funding     │  Projects    │  Rate        │
│  60,367      │  Rs 28,450 Cr│  4,230       │  72.4%       │
├──────────────┴──────────────┴──────────────┴──────────────┤
│                                                             │
│  Sector Distribution          │  Monthly Activity           │
│  ───────────────────          │  ────────────────           │
│  [Doughnut chart]            │  [Line chart]                │
│  Roads: 31%                  │  Reports filed trend          │
│  Education: 24%              │  Projects completed trend     │
│  Water: 18%                 │  Satellite alerts trend       │
│  Health: 12%                │                              │
│  Other: 15%                 │                              │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  Latest Activity                                             │
│  ───────────────                                            │
│  📍 Road construction — Bangalore [Completed, 2 days ago]  │
│  📍 School renovation — Mysore [At Risk, flagged today]    │
│  📍 Water supply — Mangalore [Report filed, under review] │
│  [View All Public Projects →]                                │
│                                                             │
│  [Report an Issue →]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## Citizen Reporting

### Report Submission Flow

```
┌──────────────────────────────────────────────┐
│  Report an Issue                              │
├──────────────────────────────────────────────┤
│                                               │
│  Step 1: Locate Project                       │
│  ─────────────────────                       │
│  🔍 Search: [Search by name, location...]    │
│                                               │
│  Or: Use map to select project                │
│  [Interactive map with project pins]          │
│                                               │
│  Selected: Road — Hegdenagar to Byadarahalli  │
│  Constituency: Lok Sabha 12 — Bangalore N    │
│  Contractor: ABC Constructions Pvt Ltd       │
│  Budget: Rs 2.5 Cr | Progress: 65%            │
│                                               │
│  Step 2: Issue Type                          │
│  ─────────────────                          │
│  ○ Construction Quality                      │
│  ○ Delay / Stall                             │
│  ○ Fund Misuse                               │
│  ○ Safety Hazard                             │
│  ○ Environmental Violation                   │
│  ○ Community Misconduct                      │
│  ○ Other                                     │
│                                               │
│  Step 3: Description                         │
│  ─────────────────                          │
│  [Textarea — describe the issue]             │
│  Max 2000 characters                         │
│                                               │
│  Step 4: Evidence (optional)                 │
│  ────────────────────────                    │
│  📷 Upload photos (max 5, 10MB each)         │
│  📍 Share location (GPS coordinates)         │
│  📄 Upload documents (optional)              │
│                                               │
│  Step 5: Your Details                        │
│  ───────────────────                         │
│  [Name] [Phone/Email]                        │
│  □ Submit anonymously                        │
│                                               │
│  ⚠ Your report will be visible publicly      │
│    but your identity will be protected       │
│                                               │
│  [Submit Report]                             │
└──────────────────────────────────────────────┘
```

### Report Validation Rules

```typescript
// apps/api/src/services/reportValidation.ts
export const REPORT_VALIDATION = {
  minDescriptionLength: 20,
  maxDescriptionLength: 2000,
  allowedMediaTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  maxFiles: 5,
  requiresLocation: false,       // optional but encouraged
  anonymousThreshold: 3,          // reports before identity check
} as const;
```

### Report Confirmation

After submission:
- Unique report ID generated
- Status set to `SUBMITTED`
- Report enters officer queue
- Email/SMS confirmation sent
- Public tracking page created

---

## Track Reports

Route: `/reports`

### My Reports Dashboard

```
┌─────────────────────────────────────────────────────────────┐
│  My Reports                                  [+ New Report] │
├─────────────────────────────────────────────────────────────┤
│  Filter: [All ▼] Status: [All ▼] Sort: [Newest ▼]          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Road — Hegdenagar to Byadarahalli                      │
│  Issue: Construction Quality — Drainage incomplete          │
│  Filed: 2026-09-01 | Status: ● Under Review               │
│  Constituency: LS-12 Bangalore North                       │
│  Evidence: 2 photos attached                                │
│  [View Details] [Add Update]                               │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  📍 Anganwadi Centre — Whitefield                          │
│  Issue: Delay — No work in 4 months                        │
│  Filed: 2026-08-15 | Status: ● Escalated to MP            │
│  Constituency: LS-12 Bangalore North                        │
│  Evidence: 1 photo attached                                │
│  Officer Note: "Verified. Escalated to Hon. MP."           │
│  [View Details]                                            │
│                                                             │
│  ──────────────────────────────────────────────────────    │
│                                                             │
│  📍 School Renovation — JP Nagar                            │
│  Issue: Safety Hazard — Open pit near school gate          │
│  Filed: 2026-07-20 | Status: ● Resolved                   │
│  Constituency: LS-12 Bangalore North                       │
│  Resolution: "Pit filled and barrier installed."            │
│  Contractor Response: "Completed on 2026-08-05."          │
│  [View Details]                                            │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Report Status Display

| Status | Color | Description | Visible To |
|---|---|---|---|
| `SUBMITTED` | Blue | Received, in queue | Citizen, Officers |
| `UNDER_REVIEW` | Yellow | Officer is reviewing | Citizen, Officers |
| `VERIFIED` | Green | Officer confirmed issue | Citizen, Officers, MP |
| `ESCALATED` | Orange | Escalated to MP/ACB | Citizen, Officers, MP |
| `RESOLVED` | Green | Issue addressed | Everyone |
| `FALSE` | Gray | Report found incorrect | Citizen, Officers |
| `CLOSED` | Gray | Report closed | Everyone |

### Report Detail Page

Shows:
- Full issue description
- Evidence photos/documents (with timestamps)
- Officer verification notes (non-identifying)
- Timeline of all status changes
- Contractor response (if any)
- MP escalation (if any)
- Resolution details

---

## Follow / Watch

Citizens can follow projects to receive notifications:

### Following a Project

```typescript
// POST /projects/:id/follow
{
  "notifyOnStatusChange": true,
  "notifyOnMilestone": true,
  "notifyOnReport": false,
  "notifyOnReportResponse": true,
}
```

### Follow Dashboard

Route: `/following`

```
┌─────────────────────────────────────────────────────────────┐
│  Projects I'm Following                                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📍 Road — Hegdenagar to Byadarahalli  ★ Following        │
│  Progress: 65% → 72% (updated today)                      │
│  [View Project] [Unfollow]                                  │
│                                                             │
│  📍 Anganwadi Centre — Whitefield       ★ Following        │
│  Progress: 30% (unchanged for 45 days)                     │
│  ⚠ No progress detected — satellite flagged               │
│  [View Project] [Unfollow]                                 │
│                                                             │
│  📍 Storm Water Drain — Yelahanka     ★ Following          │
│  Status changed: IN_PROGRESS → COMPLETED                   │
│  [View Project] [Unfollow]                                 │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## Source Attribution

All public data shows its source:

```
Data Sources:
• Project data: Ministry of Statistics & Programme Implementation (MoSPI)
• Satellite imagery: European Space Agency — Sentinel-2 (CDSE)
• Financial data: PFMS (Public Financial Management System)
• Constituency boundaries: Election Commission of India
• Geocoding: OpenStreetMap contributors

Last updated: 2026-09-06 | Data refresh: Daily
```

---

## Security Boundaries

Citizens CAN:
- View all public project data
- Submit reports on any project
- Follow/watch any public project
- Track their own reports
- Receive notifications (if following)
- Access transparency portal
- Export public data

Citizens CANNOT:
- See internal officer notes or risk scores
- See unverified contractor responses
- Access verification queue
- Open or manage cases
- See other citizens' reports (privacy)
- Access satellite raw imagery
- Modify any record
- Access officer-only data
- View audit logs
- Access MP/officer dashboards
