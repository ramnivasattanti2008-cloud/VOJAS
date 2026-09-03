# VOJAS 2.0 — UI Architecture

> **Project-centric, evidence-driven geospatial intelligence.**

This document defines the information architecture, navigation, and route
layout for the VOJAS user experience. Every screen exists to help a user
investigate the *geographic and historical reality* of a public project.

---

## 1. Information architecture

### Global (top-level)
- **Command Center** (`/`) — situational overview
- **Projects** (`/projects`) — searchable project list
- **Map** (`/map`) — full-screen geospatial workspace
- **Intelligence** (`/intelligence`) — AI findings, anomalies, risk
- **Alerts** (`/alerts`) — verification queue
- **Verification** (`/verification`) — officer workspace
- **Reports** (`/reports`) — generated PDFs

### Project (`/projects/:id`)
The Project is the **central object** of VOJAS. Every tab exists to expose
a different lens on the same project.

- Overview
- Location
- Timeline
- Satellite
- Progress
- Finance
- Documents
- Procurement
- Citizen Reports
- Environmental
- AI Findings
- Verification
- Evidence
- Audit History

### Administration
- Users
- Roles
- Data Sources
- Data Quality
- System Monitoring
- Audit Logs

---

## 2. Navigation

Persistent left rail:

| Icon | Label | Route |
|------|-------|-------|
| Compass | Command Center | `/` |
| Grid | Projects | `/projects` |
| MapPin | Map | `/map` |
| Brain | Intelligence | `/intelligence` |
| Bell | Alerts | `/alerts` |
| CheckSquare | Verification | `/verification` |
| FileText | Reports | `/reports` |

Bottom:
- AI Assistant
- Notifications
- Profile / Role switcher

Behaviour:
- **Collapsed mode** (default) — icon + tooltip.
- **Expanded mode** — icon + label.
- **Keyboard**: `g p` → projects, `g m` → map, `g i` → intelligence.
- **Focus states**: 2px focus ring on all interactive elements.
- **Mobile**: bottom tab bar with 5 most-used items.

---

## 3. Route structure (Next.js App Router)

```
app/
├── layout.tsx                       # Root layout (theme, fonts, providers)
├── (auth)/
│   ├── login/page.tsx
│   └── register/page.tsx
├── (dashboard)/
│   ├── layout.tsx                   # Sidebar shell
│   ├── page.tsx                     # Command Center
│   ├── projects/
│   │   ├── page.tsx                 # Projects list
│   │   └── [id]/
│   │       ├── page.tsx             # Project overview
│   │       ├── location/page.tsx
│   │       ├── timeline/page.tsx
│   │       ├── satellite/page.tsx   # ⭐ Time machine
│   │       ├── progress/page.tsx
│   │       ├── finance/page.tsx
│   │       ├── documents/page.tsx
│   │       ├── procurement/page.tsx
│   │       ├── reports/page.tsx     # Citizen reports
│   │       ├── environmental/page.tsx
│   │       ├── findings/page.tsx    # AI findings
│   │       ├── verification/page.tsx
│   │       ├── evidence/page.tsx
│   │       └── audit/page.tsx
│   ├── map/page.tsx
│   ├── intelligence/page.tsx
│   ├── alerts/page.tsx
│   ├── verification/page.tsx
│   └── reports/page.tsx
└── api/                             # BFF routes if needed
```

---

## 4. Page composition

Every page has the same skeleton:

```
┌──────────────────────────────────────────────────────────┐
│ Header: breadcrumb · title · status · actions            │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────┐                                       │
│  │ Primary panel  │   Secondary panels (right rail)         │
│  │                │                                       │
│  │  (map, table,  │   - Status                              │
│  │   timeline)    │   - Recent activity                     │
│  │                │   - Verification queue                  │
│  └────────────────┘   - Evidence chain                     │
└──────────────────────────────────────────────────────────┘
```

For **Project** the primary panel is the **Map + Time Machine** split
horizontally. For **Map** the primary panel is the full-screen map.

---

## 5. State management

| Layer | Tool |
|-------|------|
| Server state | TanStack Query (React Query) |
| URL state | Next.js `useSearchParams` + `useRouter` |
| Local UI | React useState / useReducer |
| Auth session | httpOnly cookie + Zustand store |
| Map state | Local map instance (MapLibre / Mapbox) |
| 3D state | Three.js scene ref |

No global Redux. Page-level state where possible.

---

## 6. Loading / error / empty

Every real-data component has:
- `<Skeleton />` (no fake values)
- `<EmptyState />` (explains the real reason)
- `<ErrorState />` (what failed, what to retry, last good data)

---

## 7. Performance budget

- Initial JS: < 250 KB gz (excluding map vendor)
- Time to interactive on project page: < 3 s on 3G
- Map idle until hero finished
- 3D lazy on `requestIdleCallback`

---

## 8. Accessibility

- All status communicated via icon + text + colour.
- ARIA roles on tabs, modals, alerts.
- Reduced motion: disables cinematic opening, 3D, all non-essential
  transitions.
- Focus management on route change.

---

## 9. Trust design

Every AI claim has an "Evidence" link.
Every satellite observation has a "Source" link.
Every uncertain result uses a probability label, not a certainty.
The UI itself must communicate trust.
