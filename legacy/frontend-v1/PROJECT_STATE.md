# VOJAS — Current State

**Live**: https://vojas-frontend.vercel.app (Vercel auto-deploys on push to master)

## UI Redesign (2026-09-01)

User asked for "full power" dramatic UI treatment across **all pages** (not just dashboard).

### Shared UI Kit (frontend/src/components/ui/)
- `PageHeader.tsx` — vertical accent bar, gradient word title, breadcrumbs, action slot
- `SectionTitle.tsx` — section heading with icon + badge + "view all" link
- `GlowCard.tsx`, `MetricCard.tsx`, `MetricStrip.tsx`
- `Badge.tsx`, `StatusBadge` helper
- `TableWrapper.tsx` — generic typed table with row click
- `Animations.tsx` — `EASE`, `fadeUp`, `staggerContainer`, `blurIn`, `scaleIn`, `slideLeft`
- `Empty.tsx` — animated empty state with accent palette
- `Skeleton.tsx`

### Dashboard Components (frontend/src/components/dashboard/)
- `HeroBanner.tsx` — cinematic hero with WebGL AnimatedGrid + 4 stat blocks
- `HeroMetrics.tsx` — 4 hero metric cards with CountUp + sparkline + delta
- `LiveTicker.tsx` — Bloomberg-style marquee of 10 KPIs
- `RibbonGauge.tsx` — 140px SVG circular progress rings with glow
- `AnimatedGrid.tsx` — WebGL particle grid backdrop

### Pages Rewritten
- DashboardPage — full cinematic redesign (62.05 kB)
- ProjectsPage — gradient title, animated progress bars
- AnomaliesPage — saffron accent, glowing stat cards
- RiskDashboardPage — 6-up stats, animated distribution bar, expandable rows
- AnalyticsPage — glow text-shadow on KPI numbers
- ReportsPage — saffron header, pulsing critical badge

### Bundle sizes (gzipped)
- Dashboard: 17.62 kB · Analytics: 6.64 kB · Anomalies: 4.12 kB
- Risk: 5.23 kB · Reports: 3.77 kB · Projects: 3.64 kB
- index: 129.38 kB

**Last commit**: f1bcb3b — feat: apply dramatic UI treatment to all pages
