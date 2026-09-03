# VOJAS 2.0 — Design System

> Premium, calm, evidence-driven. Built for serious investigation, not
> dashboards-as-decoration.

---

## 1. Design philosophy

- **Calm, not loud.** Restraint is the new luxury.
- **Geographic first.** Maps are the primary object, not charts.
- **Evidence is the hero.** Every claim links to source data.
- **No fake data.** Empty is honest. Loading is honest. Error is honest.
- **Dark by default** with light theme support.

---

## 2. Color tokens

### 2.1 Palette (dark, default)

```
bg.base       #0A0E14   // app background
bg.elevated   #11161F   // cards, modals
bg.overlay    #1A2230   // hover, active
surface.glass rgba(255,255,255,0.04) // soft layer

text.primary   #E6EAF0
text.secondary #8E97A7
text.muted     #5C6473
text.mono      #C4D2E0   // for coordinates, IDs

border.subtle  #1E2632
border.default #2A3340
border.focus   #4A90E2

accent.primary   #3D7DFF   // VOJAS blue
accent.geographic #00C2A8   // signal green
accent.warning  #F0A050
accent.risk     #E15554
accent.critical #C03A3A
accent.success  #45B97C
accent.info     #6F8FE0

state.observation.available  #45B97C
state.observation.missing   #8E97A7
state.observation.cloudy    #F0A050
state.verification.verified #45B97C
state.verification.pending  #F0A050
state.verification.flagged  #E15554
```

### 2.2 Status semantics

| State | Color | Icon | Use |
|-------|-------|------|-----|
| Available | success.green | check | observation found |
| Pending | warning.amber | clock | sync in progress |
| No data | neutral.gray | slash | NO_USABLE_OBSERVATION |
| Risk | error.red | triangle | anomaly flagged |
| Verified | success.green | badge | officer signed off |
| Cloudy | warning.amber | cloud | cloud cover too high |
| Confidence LOW | muted.gray | dot | unreliable result |

Color is never the only signal. Always pair with icon + text.

---

## 3. Typography

- **Display** 48/56 — Geist Bold — for hero metrics
- **H1** 32/40 — Geist SemiBold — page title
- **H2** 24/32 — Geist SemiBold — section title
- **H3** 18/24 — Geist Medium — card title
- **Body** 14/22 — Geist Regular — main text
- **Label** 12/16 — Geist Medium UPPER, tracking 0.04em
- **Metadata** 12/18 — Geist Regular muted
- **Mono** 13/20 — JetBrains Mono — coordinates, IDs, dates

---

## 4. Spacing & layout

4 px base unit. Common: 4, 8, 12, 16, 24, 32, 48, 64.

Grid: 12 columns desktop, 8 tablet, 4 mobile. Max content width 1440 px.

Radii: 4, 6, 8, 12, 16, 24. Never 9999 / pill on serious surfaces.

---

## 5. Shadows (dark theme)

```
shadow.sm  0 1px 2px rgba(0,0,0,.6)
shadow.md  0 4px 12px rgba(0,0,0,.5)
shadow.lg  0 12px 32px rgba(0,0,0,.6)
shadow.glow 0 0 24px rgba(61,125,255,.18)  // active state
```

---

## 6. Motion

- 120 ms micro (hover, focus)
- 240 ms standard (tabs, panels)
- 480 ms large (page transitions)
- Easing: `cubic-bezier(0.4, 0, 0.2, 1)` (Material standard)

`prefers-reduced-motion` collapses all to 0 ms.

---

## 7. Iconography

Stroke icons, 1.5 px, 20 px default. Set: Lucide. Custom: 8 icons for
VOJAS-specific concepts (geographic ring, observation node, evidence
chain).

---

## 8. Component library

| Component | Variant | Notes |
|-----------|---------|-------|
| Button | primary / secondary / ghost / danger | loading state mandatory |
| Input | text / search / date / coords | monospace for lat/lng |
| Card | flat / elevated / glass | no shadows on flat |
| Panel | collapsible, draggable | used for right rail |
| Badge | status / count / role | always icon + text |
| Tabs | underline / pill | animated indicator |
| Modal | center / drawer | focus trap |
| Timeline | vertical / horizontal | weekly checkpoints |
| Map | 2D / 3D | layers, opacity, time cursor |
| ProjectCard | list / grid | real thumbnail where available |
| ObservationCard | full / compact | satellite provenance |
| EvidenceChain | steps | source → finding → verification |
| FindingCard | risk / info | always expandable |
| Chart | line / bar / area | Recharts |
| DataTable | sortable / filterable | virtualization for >100 rows |
| StatusIndicator | dot / ring | color + icon + label |
| EmptyState | icon + headline + reason | no fake data |
| Skeleton | per-component | matches final layout |
| ErrorState | icon + headline + reason + retry | |

---

## 9. State communication

Every interactive component exposes:
- `default`
- `hover`
- `focus-visible` (2px accent ring)
- `active`
- `disabled`
- `loading`
- `error`
- `empty`

---

## 10. Voice & tone

- **Calm.** Not "🚨 CRITICAL ANOMALY DETECTED".
- **Honest.** "Satellite-observable change detected." Not "We caught them."
- **Specific.** "Confidence: MEDIUM. Cloud cover 47%. Resolution 10 m."
- **Cited.** Every metric links to the source observation.

---

## 11. Implementation

- Tailwind CSS for utility classes
- CSS custom properties for tokens (`var(--bg-base)`, etc.)
- `cva` (class-variance-authority) for component variants
- Tailwind plugin for design tokens
- shadcn-style component primitives where useful

---
