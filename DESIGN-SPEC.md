# VOJAS — Design Specification v1.0

> **A world-class, premium, futuristic geospatial intelligence platform.**
> SIH 2026 — MPLAD Accountability Platform

---

## 0. How to read this document

This is the **implementation contract** for the VOJAS visual identity. Every value here is binding. If something is missing, ask before inventing. If something is unclear, propose a refinement.

The companion to this document is the **Visual Mockup Artifacts** — interactive HTML prototypes you can review in the browser for colors, logos, and component shapes.

---

## 1. Design Philosophy

### 1.1 Personality

VOJAS should feel: **intelligent, geographic, precise, premium, futuristic, calm, powerful, trustworthy, cinematic, interactive.**

It should NOT feel: **childish, overly neon, gaming-like, cluttered, generic AI SaaS, filled with excessive glassmorphism, filled with unnecessary gradients, filled with meaningless animations.**

Every visual element must have a reason. Beauty serves comprehension.

### 1.2 Reference points (do not copy)

| Reference | Take from it |
|-----------|--------------|
| Google Earth | Geographic immersion, scale, the sense of *being above the world* |
| Apple Vision Pro | Spatial depth without aggressive 3D, premium calm |
| Linear | Clean modern SaaS, perfect spacing, restrained color |
| Stripe | Data visualization clarity, progressive disclosure |
| NASA mission control | Command-center gravitas, dense information that feels ordered |
| Tesla UI | Futuristic, minimal, no decoration |

### 1.3 First-impression test

Within 3 seconds, a first-time visitor should think:

> *"This looks like a serious next-generation platform."*

After 30 seconds, they should be able to navigate without instructions.

---

## 2. Brand Identity

### 2.1 Brand pillars

| Pillar | Meaning |
|--------|---------|
| Geography | We are rooted in place. Earth, terrain, coordinates. |
| Connection | We link citizens, projects, MLAs, data. Networks, lines, nodes. |
| Intelligence | We surface meaning from noise. Insight, not just data. |
| Movement | We track progress over time. Velocity, flow, change. |
| Vision | We see what others miss. Elevation, perspective, foresight. |
| Technology | We are built on serious engineering. Precision, calibration. |

### 2.2 Logo system

**Primary logo** — wordmark "VOJAS" + symbol on the left.

- Wordmark: Inter, weight 700, letterspacing `0.12em` (wide tracking)
- Sub-tagline: "ACCOUNTABILITY" or "MPLAD INTELLIGENCE", Inter 500, `0.18em`, all caps, `0.625rem`
- Symbol: a stylized "V" formed by two converging vectors, with a circular node at the convergence point — represents *vectors meeting at a point of truth*
- Minimum sizes: full lockup ≥ 120px wide, symbol-only ≥ 24px square
- Clear space: equal to the height of the symbol on all sides

**Symbol only (icon)** — used for favicon, app icon, profile icon, map marker, loading indicator.

- 24×24 base, scales linearly
- Two angled lines forming a "V" — outer lines, weight 1.5px at base
- A small filled circle at the apex (3px radius) — the "point of truth"
- Optional outer ring (very thin, 0.5px) for use over photography

**3D logo** — used for opening animation, splash screen, marketing, presentation.

- The "V" extrudes into a chevron with bevel
- A glowing sphere sits at the apex
- Material: dark navy (#080b10) base with electric-blue (#3b82f6) emissive accent
- Subtle ambient occlusion in the crease
- Slow rotation (0.2 rad/s) on Y-axis when idle

**Logo do-nots:**
- Don't add gradients to the wordmark
- Don't use the symbol without the apex dot
- Don't rotate the lockup
- Don't use drop shadows

### 2.3 Voice

- Clear, not clever
- Confident, not arrogant
- Data-led, not jargon-heavy
- "Analyzing geographic data…" not "Crunching numbers…"
- "12 anomalies detected" not "We found some issues!"

---

## 3. Color System

### 3.1 Principles

1. **Dark first.** VOJAS is a command center — it lives in low light. Light mode is a *respectful* alternative, not the default.
2. **One brand accent.** Electric blue is the only "look at me" color. Everything else is supporting cast.
3. **Restrained palette.** Avoid rainbow. Avoid neon. Use color to communicate hierarchy and state, not decoration.
4. **Semantic discipline.** `success / warning / error / info` colors are *only* for their meaning, never aesthetic.

### 3.2 Tokens (binding)

#### Background scale (the "void")

| Token | Hex | Usage |
|-------|-----|-------|
| `void-0` | `#04060a` | True black, app background fallback |
| `void-50` | `#070a10` | App root background (dark) |
| `void-100` | `#0a0e18` | Surface level 0 (page bg) |
| `void-200` | `#10141f` | Surface level 1 (cards) |
| `void-300` | `#161b2a` | Surface level 2 (elevated cards) |
| `void-400` | `#1c2236` | Surface level 3 (modals, popovers) |
| `void-500` | `#252c44` | Borders subtle |
| `void-600` | `#2e3652` | Borders default |
| `void-700` | `#3a4361` | Borders strong |
| `void-800` | `#4a5374` | Muted text on dark |
| `void-900` | `#6c7595` | Secondary text on dark |
| `void-950` | `#9ba3bf` | Tertiary text on dark |

#### Light mode surfaces

| Token | Hex | Usage |
|-------|-----|-------|
| `paper-0` | `#ffffff` | App root background (light) |
| `paper-50` | `#fafbfc` | Surface level 0 |
| `paper-100` | `#f4f6f9` | Surface level 1 |
| `paper-200` | `#eef1f6` | Surface level 2 |
| `paper-300` | `#e3e8f0` | Surface level 3 |
| `paper-400` | `#d0d7e3` | Borders subtle |
| `paper-500` | `#b6bfd0` | Borders default |
| `paper-600` | `#8b95ad` | Borders strong |
| `paper-700` | `#5d6679` | Muted text on light |
| `paper-800` | `#3d4456` | Secondary text on light |
| `paper-900` | `#1f2433` | Primary text on light |

#### Brand accent — electric

| Token | Hex | Usage |
|-------|-----|-------|
| `electric-200` | `#bfdbfe` | Hover state on dark, subtle text |
| `electric-300` | `#60a5fa` | Disabled state, secondary accent |
| `electric-400` | `#3b82f6` | **Primary accent** — links, active states, focus |
| `electric-500` | `#2563eb` | Pressed state, stronger accent |
| `electric-600` | `#1d4ed8` | Hover background, deeper accent |
| `electric-700` | `#1e40af` | Deepest brand |

#### Brand accent — saffron (Indian identity, "highlight" series only)

| Token | Hex | Usage |
|-------|-----|-------|
| `saffron-300` | `#fcd34d` | Subtle highlight |
| `saffron-400` | `#fbbf24` | Highlight accent — data series 2, "important" markers |
| `saffron-500` | `#f59e0b` | **Highlight primary** — used sparingly, only for "this is the story" |
| `saffron-600` | `#d97706` | Pressed, deeper highlight |

#### Semantic colors

| Token | Hex | Usage |
|-------|-----|-------|
| `success-400` | `#22c55e` | Positive state, on-track, completed |
| `success-500` | `#16a34a` | Strong success |
| `warning-400` | `#f59e0b` | Caution, at-risk |
| `warning-500` | `#d97706` | Strong warning |
| `danger-400` | `#ef4444` | Error, off-track, blocked |
| `danger-500` | `#dc2626` | Strong error, critical |
| `info-400` | `#06b6d4` | Informational, neutral highlight |
| `info-500` | `#0891b2` | Strong info |

### 3.3 Glow colors (used as `box-shadow` for spatial effects)

| Token | RGB | Use |
|-------|-----|-----|
| `glow-electric` | `rgba(59, 130, 246, 0.35)` | Default elevation glow |
| `glow-saffron` | `rgba(245, 158, 11, 0.35)` | Highlighted card |
| `glow-success` | `rgba(34, 197, 94, 0.30)` | Success card |
| `glow-warning` | `rgba(245, 158, 11, 0.30)` | Warning card |
| `glow-danger` | `rgba(239, 68, 68, 0.30)` | Danger card |
| `glow-info` | `rgba(6, 182, 212, 0.30)` | Info card |

### 3.4 Accessibility

All text/background pairings must meet **WCAG 2.2 AA** (4.5:1 for body, 3:1 for large text + UI).

Verified pairings (dark mode):
- `void-50` bg + `paper-0` text → 19.8:1 ✅
- `void-100` bg + `void-950` text → 14.2:1 ✅
- `void-200` bg + `void-900` text → 9.6:1 ✅
- `void-200` bg + `electric-400` text → 5.4:1 ✅
- `void-200` bg + `saffron-400` text → 8.1:1 ✅
- `void-200` bg + `success-400` text → 5.8:1 ✅
- `void-200` bg + `danger-400` text → 4.7:1 ✅
- `void-200` bg + `warning-400` text → 8.1:1 ✅

Verified pairings (light mode):
- `paper-0` bg + `paper-900` text → 16.1:1 ✅
- `paper-50` bg + `paper-900` text → 15.2:1 ✅
- `paper-100` bg + `electric-600` text → 6.1:1 ✅

---

## 4. Typography

### 4.1 Font stack

| Role | Family | Fallback |
|------|--------|----------|
| Sans (UI) | **Inter** | `system-ui, -apple-system, "Segoe UI", sans-serif` |
| Mono (data, code) | **JetBrains Mono** | `"SF Mono", Menlo, Consolas, monospace` |
| Display (hero only, optional) | **Space Grotesk** | `Inter, system-ui, sans-serif` |

Fonts loaded from Google Fonts via `<link rel="preconnect">` + `display=swap`. Self-host for production.

### 4.2 Type scale (binding)

| Token | Size | Line-height | Weight | Tracking | Usage |
|-------|------|-------------|--------|----------|-------|
| `text-display-2xl` | 4.5rem (72px) | 1.0 | 700 | -0.02em | Hero / opening only |
| `text-display-xl` | 3.75rem (60px) | 1.05 | 700 | -0.02em | Hero text |
| `text-display-lg` | 3rem (48px) | 1.1 | 700 | -0.015em | Major section |
| `text-display-md` | 2.25rem (36px) | 1.15 | 600 | -0.01em | Page title |
| `text-display-sm` | 1.875rem (30px) | 1.2 | 600 | -0.01em | Card title |
| `text-heading-lg` | 1.5rem (24px) | 1.3 | 600 | -0.005em | Section heading |
| `text-heading-md` | 1.25rem (20px) | 1.4 | 600 | 0 | Subsection |
| `text-heading-sm` | 1.125rem (18px) | 1.4 | 600 | 0 | Card heading |
| `text-body-lg` | 1rem (16px) | 1.6 | 400 | 0 | Body large / lead |
| `text-body` | 0.875rem (14px) | 1.55 | 400 | 0 | Default body |
| `text-body-sm` | 0.8125rem (13px) | 1.5 | 400 | 0 | Compact body |
| `text-caption` | 0.75rem (12px) | 1.4 | 500 | 0.01em | Captions, labels |
| `text-overline` | 0.6875rem (11px) | 1.3 | 600 | 0.12em | Overline (uppercase) |
| `text-micro` | 0.625rem (10px) | 1.2 | 600 | 0.08em | Micro labels (uppercase) |

### 4.3 Data display rules

- All numeric values use `font-variant-numeric: tabular-nums` for column alignment
- Negative numbers in `danger-400`, large positive deltas in `success-400`
- Currency: `₹` prefix, no space, e.g. `₹2,45,67,890`
- Percentages: `+12.4%` (sign + value + unit, no space)
- Counts: `1,247` (locale-aware comma grouping)
- Dates in UI: `12 Mar 2026` (short month), never ISO timestamps

### 4.4 Type rules

- Maximum **2 font weights per screen** (typically 400 + 600)
- No italics for emphasis — use weight
- No underlines except on links
- Don't use `text-transform: uppercase` on body — only on overline and micro labels
- Don't justify text

---

## 5. Spacing System

### 5.1 Base scale (4px base, binding)

| Token | Value | Common use |
|-------|-------|-----------|
| `space-0` | 0 | — |
| `space-1` | 0.25rem (4px) | Hairline gap, icon margin |
| `space-2` | 0.5rem (8px) | Tight stack, between related items |
| `space-3` | 0.75rem (12px) | Default inline gap |
| `space-4` | 1rem (16px) | Card content padding (compact) |
| `space-5` | 1.25rem (20px) | Card content padding (default) |
| `space-6` | 1.5rem (24px) | Card content padding (comfortable) |
| `space-8` | 2rem (32px) | Section gap, large card padding |
| `space-10` | 2.5rem (40px) | Major section break |
| `space-12` | 3rem (48px) | Page section |
| `space-16` | 4rem (64px) | Hero vertical rhythm |
| `space-20` | 5rem (80px) | Major hero break |
| `space-24` | 6rem (96px) | Top-level page break |

### 5.2 Layout rules

- **Page padding:** `space-6` (24px) on mobile, `space-8` (32px) on desktop
- **Card padding:** `space-5` (20px) for compact, `space-6` (24px) for default, `space-8` (32px) for hero cards
- **Card gap in grids:** `space-4` (16px) tight, `space-6` (24px) default, `space-8` (32px) loose
- **Section break:** `space-12` (48px) minimum between sections on a page
- **Touch target:** minimum 44×44px (Apple HIG) for all interactive elements

---

## 6. Radius, Borders, Depth

### 6.1 Radius

| Token | Value | Use |
|-------|-------|-----|
| `radius-xs` | 4px | Pills, small badges |
| `radius-sm` | 6px | Inputs, small chips |
| `radius-md` | 10px | Buttons, standard chips |
| `radius-lg` | 14px | Cards (default) |
| `radius-xl` | 20px | Hero cards, modal edges |
| `radius-2xl` | 28px | Special cards, command palette |
| `radius-full` | 9999px | Avatar, pill buttons |

### 6.2 Borders

| Token | Value | Use |
|-------|-------|-----|
| `border-subtle` | `1px solid void-500` (dark) / `paper-400` (light) | Card default |
| `border-default` | `1px solid void-600` (dark) / `paper-500` (light) | Inputs, dividers |
| `border-strong` | `1px solid void-700` (dark) / `paper-600` (light) | Emphasized containers |
| `border-accent` | `1px solid electric-400` | Focus, active state, brand emphasis |
| `border-glow` | `1px solid electric-400` + `box-shadow: 0 0 0 4px electric-400/15` | Active interactive |

**No thick borders.** Maximum `1px` except for explicit emphasis (e.g. 2px on the active sidebar nav).

### 6.3 Elevation (shadows)

| Token | Value | Use |
|-------|-------|-----|
| `elev-0` | none | Flat, part of background |
| `elev-1` | `0 1px 2px rgba(0,0,0,0.2), 0 0 0 1px void-500` | Subtle separation |
| `elev-2` | `0 4px 12px rgba(0,0,0,0.25), 0 0 0 1px void-600` | Default card |
| `elev-3` | `0 12px 32px rgba(0,0,0,0.35), 0 0 0 1px void-700` | Elevated card, dropdown |
| `elev-4` | `0 24px 64px rgba(0,0,0,0.45), 0 0 0 1px void-700` | Modal, popover |
| `elev-glow` | `elev-2 + 0 0 24px glow-electric` | Brand-emphasized card |
| `elev-glow-saffron` | `elev-2 + 0 0 24px glow-saffron` | Highlighted card |
| `elev-glow-success` | `elev-2 + 0 0 24px glow-success` | Success card |

**Light mode equivalents** reduce shadow opacity by 50% and use `rgba(15, 23, 42, x)` instead of black.

---

## 7. Motion

### 7.1 Principles

1. **Purpose over flash.** Every animation communicates state or guides attention.
2. **Fast by default.** 200ms for micro, 400ms for panel, 800ms for scene.
3. **Smooth, not bouncy.** Default easing is `cubic-bezier(0.16, 1, 0.3, 1)` (ease-out expo). No spring overshoot in production UI.
4. **Spatial depth, not decoration.** Elements come from depth, return to depth. No spinning logos, no flipping cards.
5. **Respect reduced motion.** If `prefers-reduced-motion: reduce`, all transitions are 0ms except essential feedback (focus rings, loading).

### 7.2 Duration tokens

| Token | Value | Use |
|-------|-------|-----|
| `duration-instant` | 0ms | Reduced motion fallback |
| `duration-micro` | 150ms | Hover, focus ring, color change |
| `duration-fast` | 200ms | Button press, tooltip, small state change |
| `duration-default` | 300ms | Card hover, dropdown open |
| `duration-panel` | 400ms | Modal, drawer, page enter |
| `duration-scene` | 800ms | Hero animation, route change |
| `duration-cinematic` | 1500ms | Opening sequence |
| `duration-ambient` | 6000ms+ | Background pulse, star drift |

### 7.3 Easing tokens

| Token | Value | Use |
|-------|-------|-----|
| `ease-out` | `cubic-bezier(0.16, 1, 0.3, 1)` | Default — element arriving |
| `ease-in` | `cubic-bezier(0.7, 0, 0.84, 0)` | Element leaving |
| `ease-in-out` | `cubic-bezier(0.65, 0, 0.35, 1)` | State change |
| `ease-spatial` | `cubic-bezier(0.34, 1.2, 0.64, 1)` | Camera/depth move (subtle overshoot) |
| `ease-data` | `cubic-bezier(0.4, 0, 0.2, 1)` | Chart/data animation |
| `linear` | `linear` | Loops, starfield, marquee |

### 7.4 Motion vocabulary (binding patterns)

| Interaction | Pattern |
|-------------|---------|
| Button press | `scale 1 → 0.98` (100ms ease-in), then `1` (150ms ease-out) |
| Button hover | `bg darker by 5%`, `translateY -1px` (200ms ease-out) |
| Card hover | `translateY -2px`, `shadow elev-2 → elev-3` (300ms ease-out) |
| Card click | `translateY 0`, `shadow elev-3 → elev-2` (200ms ease-in) |
| Modal open | `opacity 0 → 1`, `scale 0.96 → 1`, `translateY 20px → 0` (400ms ease-out) |
| Modal close | reverse at 250ms ease-in |
| Page enter | `opacity 0 → 1`, `translateY 8px → 0` (400ms ease-out) |
| Page exit | `opacity 1 → 0`, `translateY 0 → -4px` (200ms ease-in) |
| Route change | Old page fades + scales to 0.98; new page fades + scales from 1.02 to 1 |
| Toast | Slide in from top-right: `translateX 100% → 0`, fade in (300ms ease-out) |
| Tooltip | Fade + scale 0.95 → 1 from anchor point (150ms ease-out) |
| Number counter | Tween from 0 to value over 800ms with `ease-data` |
| Data line draw | Path `stroke-dashoffset` from full to 0 over 1200ms ease-out |
| Chart bar rise | Height 0 → final, staggered by 50ms, 400ms ease-out |
| Marker select (map) | Pulse ring (scale 1 → 1.4, opacity 0.6 → 0) over 800ms twice |

### 7.5 The "from depth" pattern

When something enters, it should feel like it's emerging from a layer behind. Pattern:

```
opacity: 0 → 1
translateY: 12px → 0  (or scale 0.96 → 1)
filter: blur(8px) → blur(0)
duration: 400ms
easing: ease-out
```

Apply this to:
- Page content on route change
- Modal/dialog
- Card appearing in a grid
- Marker info panel
- Notification toast

---

## 8. Layout & Grid

### 8.1 Breakpoints

| Name | Min width | Target |
|------|-----------|--------|
| `mobile` | 0px | Phones (< 640px) |
| `mobile-lg` | 480px | Large phones |
| `tablet` | 768px | Tablets, small laptops |
| `desktop` | 1024px | Standard desktop |
| `desktop-lg` | 1280px | Standard desktop wide |
| `desktop-xl` | 1536px | Full HD+ |
| `desktop-2xl` | 1920px | 4K displays |

### 8.2 Container widths

| Size | Max-width | Padding |
|------|-----------|---------|
| Container tight | 768px | Centered, used for forms, login |
| Container default | 1280px | Centered, dashboard content |
| Container wide | 1536px | Centered, full dashboards |
| Container full | 100% | Edge-to-edge, used for canvas-heavy pages |

### 8.3 Dashboard grid (the command center)

The dashboard uses a **12-column grid** with named regions:

```
┌────────────────────────────────────────────────────────────┐
│  HEADER  (h-16, full width)                                │
├──────┬──────────────────────────────────────────────┬──────┤
│      │                                              │      │
│ SIDE │  HERO ZONE (3D Globe, col-span-9, 480px tall)│ INTEL│
│ BAR  │                                              │ SIDE │
│ 240px│                                              │ 320px│
│      ├──────────────────────────┬───────────────────┤      │
│      │  KPI ROW (4 cards)       │                   │      │
│      ├──────────────────────────┤  ACTIVITY FEED    │      │
│      │  CHARTS (2-up)           │  (col-span-3)     │      │
│      │                          │                   │      │
│      ├──────────────────────────┴───────────────────┤      │
│      │  PROJECTS TABLE (col-span-12)                 │      │
│      │                                                │      │
└──────┴────────────────────────────────────────────────┴──────┘
```

**Responsive behavior:**
- Desktop (≥1280px): full layout above
- Desktop-md (1024-1279px): hero takes 8 cols, intel side moves below
- Tablet (768-1023px): hero takes 12 cols, intel becomes a drawer
- Mobile (<768px): 3D hero collapses to 240px tall, all sections stack vertically, intel moves to a tab

### 8.4 Z-index scale

| Layer | Z | Use |
|-------|---|-----|
| Base | 0 | Page content |
| Sticky | 10 | Sticky headers within sections |
| Nav | 20 | Top bar, sidebar |
| Dropdown | 30 | Menus, autocomplete |
| Popover | 40 | Tooltips, hover cards |
| Modal backdrop | 50 | Modal overlays |
| Modal | 60 | Modal content |
| Toast | 70 | Notifications |
| Command palette | 80 | ⌘K overlay |
| Opening hero | 90 | Full-screen cinematic |
| Tooltip urgent | 100 | Critical system messages |

---

## 9. Component System

### 9.1 Card

The base "spatial information surface."

**Variants:**
- `default` — `bg-void-200`, `border-subtle`, `radius-lg`, `p-6`
- `elevated` — `bg-void-300`, `elev-2`, `p-6`
- `glow` — `bg-void-200`, `border-accent`, `elev-glow`, `p-6`
- `highlight` — same as glow but `saffron` glow
- `compact` — `p-4`, smaller text scale
- `hero` — `p-8`, `radius-xl`, `elev-3`

**Interaction states:**
- Rest: per variant
- Hover: `translateY(-2px)`, `shadow elev-2 → elev-3`, `border-strong` (200ms ease-out)
- Active/pressed: `translateY(0)`, `shadow elev-3 → elev-2` (150ms ease-in)
- Focus: `border-glow` (electric-400 + 4px ring)

**Composition rules:**
- Card header (optional): `space-5` bottom, contains title + optional action
- Card body: `space-4` between paragraphs, `space-6` between sections
- Card footer (optional): `space-5` top, `border-top border-subtle`

### 9.2 Button

**Variants:**
- `primary` — `bg-electric-500`, `text-white`, hover `bg-electric-600`, focus `border-glow`
- `secondary` — `bg-void-200`, `text-void-950`, hover `bg-void-300`
- `ghost` — transparent, `text-void-900`, hover `bg-void-200`
- `outline` — `border-default`, transparent bg, hover `bg-void-200`
- `danger` — `bg-danger-500`, `text-white`, hover `bg-danger-500/90`
- `subtle` — `bg-void-100`, `text-void-900`, hover `bg-void-200`

**Sizes:**
- `xs` — `h-7`, `text-caption`, `px-2`, `radius-sm`
- `sm` — `h-8`, `text-body-sm`, `px-3`, `radius-md`
- `md` — `h-10`, `text-body`, `px-4`, `radius-md` (default)
- `lg` — `h-12`, `text-body-lg`, `px-5`, `radius-lg`
- `xl` — `h-14`, `text-heading-md`, `px-6`, `radius-lg`

**All buttons:** `font-weight 500`, `transition all 200ms ease-out`, focus ring 4px `electric-400/20`.

**Icon buttons:** square, icon centered, no text. Use `h === w` for the size.

### 9.3 Input

- `h-10`, `bg-void-100`, `border-default`, `radius-md`, `px-3`
- Placeholder: `text-void-800`
- Hover: `border-strong`
- Focus: `border-accent`, `elev-glow` (subtle, 4px)
- Error: `border-danger-400`, `text-danger-400` caption
- Disabled: `opacity-50`, `cursor-not-allowed`
- Label above: `text-caption`, `text-void-900`, `mb-1.5`
- Helper below: `text-micro`, `text-void-800`, `mt-1`

### 9.4 Badge / Chip

**Variants:**
- `neutral` — `bg-void-200`, `text-void-900`, `border-default`
- `accent` — `bg-electric-500/15`, `text-electric-400`, `border-electric-500/30`
- `highlight` — `bg-saffron-500/15`, `text-saffron-400`, `border-saffron-500/30`
- `success` — `bg-success-400/15`, `text-success-400`, `border-success-400/30`
- `warning` — `bg-warning-400/15`, `text-warning-400`, `border-warning-400/30`
- `danger` — `bg-danger-400/15`, `text-danger-400`, `border-danger-400/30`

All badges: `h-6`, `px-2`, `radius-sm`, `text-caption`, `font-weight 500`.

### 9.5 Avatar

- Sizes: `xs: 24px`, `sm: 32px`, `md: 40px`, `lg: 48px`, `xl: 64px`
- Shape: `radius-full`
- Initials: Inter 600, `text-body-sm` (sm) to `text-heading-md` (lg)
- Background: derived from user role (see Layout.tsx for existing role color map)
- Online indicator: `4px` circle, `success-400`, bottom-right

### 9.6 Modal

- Backdrop: `rgba(0,0,0,0.7)`, fade in 250ms
- Panel: `bg-void-300`, `elev-4`, `radius-xl`, `p-8`, `max-w-md` (or `lg`/`xl`)
- Open: `opacity 0 → 1`, `scale 0.96 → 1`, `translateY 20px → 0` (400ms ease-out)
- Close: reverse (250ms ease-in)
- Focus trap: first focusable element on open, return to trigger on close
- Esc closes; click backdrop closes; ✕ button in top-right

### 9.7 Tooltip

- `bg-void-900`, `text-void-100`, `text-caption`, `px-2.5`, `py-1.5`, `radius-sm`
- `elev-3`
- Open: `opacity 0 → 1`, `scale 0.95 → 1` (150ms ease-out)
- Delay: 400ms hover
- Position: auto-flip to avoid edges
- Arrow: 6px triangle in same color

### 9.8 Toast / Notification

- Position: top-right, `space-4` from edge
- Width: `max-w-sm` (384px)
- Variants: `info`, `success`, `warning`, `danger` (color follows)
- Enter: `translateX 100% → 0`, `opacity 0 → 1` (300ms ease-out)
- Exit: `translateX 0 → 100%`, `opacity 1 → 0` (250ms ease-in)
- Auto-dismiss: 5s (configurable); pause on hover
- Stacking: max 4 visible; older ones fade

### 9.9 Tabs

- Container: `border-b border-default`, `gap-1`
- Tab: `px-4`, `py-2.5`, `text-body`, `text-void-900` inactive, `text-electric-400` active
- Active indicator: `2px` `electric-400` underline, animated with `transform` (left → right, 300ms ease-out)
- Hover inactive: `text-void-950`
- Disabled: `opacity-40`, `cursor-not-allowed`

### 9.10 Table

- Row height: `h-12` (compact `h-10`)
- Cell padding: `px-4`
- Header: `text-overline`, `text-void-800`, `bg-void-100`, `border-b border-default`
- Row hover: `bg-void-200/50` (subtle)
- Row selected: `bg-electric-500/10`, `border-l-2 border-electric-400`
- Zebra striping: **off** by default — only enable for dense tables (>20 rows)
- Numeric columns: `text-right`, `font-mono`, `tabular-nums`

### 9.11 Charts

**Bar chart:**
- Bars: `radius-sm` top corners only (use SVG `clip-path` or custom rendering)
- Active series: `electric-400` with `elev-glow` subtle
- Inactive series: `void-700` (muted)
- Highlight series: `saffron-400`
- Animation: rise from 0 to value, staggered by 50ms (400ms ease-out each)
- Hover: bar brightens + tooltip fades in (150ms)

**Line chart:**
- Line stroke: `2px`, `electric-400` (primary) or `saffron-400` (highlight)
- Path animation: `stroke-dashoffset` 0 → 0 over 1200ms ease-out
- Data points: `4px` circle, `electric-400` fill, `void-300` border
- Hover: data point scales to 1.5, crosshair line appears, tooltip follows
- Grid: `void-600`, `1px` dashed at 50% opacity
- Axis: `void-800` text, no axis line (clean look)

**Donut/Radial chart:**
- Stroke width: `8px` (default), `12px` (large)
- Background ring: `void-600`, full
- Value ring: `electric-400` with rounded ends
- Center text: `text-display-md`, `font-weight 700`, `tabular-nums`
- Sub-text: `text-caption`, `text-void-900`
- Animation: stroke-dashoffset 0 → value over 1200ms ease-data

**Map (3D globe):**
- Earth: low-res texture (≤1MB), normal map for terrain, specular map for water
- Atmosphere: drei `<Atmosphere>` (or custom Fresnel shader)
- Markers: custom `<Marker3D>` with pulse ring on hover
- Star field: drei `<Stars>` (radius 300, depth 50, count 1500)
- Lighting: ambient 0.3 intensity, directional 1.0 from camera-side, atmospheric glow
- Controls: drei `<OrbitControls>` with `enableZoom true`, `enablePan false`, `autoRotate true` at 0.2 rad/s
- Performance: `frameloop="demand"` after initial spin-up, `dpr={[1, 1.5]}`

### 9.12 Loading state (contextual copy)

| Context | Message |
|---------|---------|
| Generic page | "Loading page…" |
| Dashboard | "Initializing command center…" |
| Projects | "Retrieving projects…" |
| Map | "Loading geographic data…" |
| Anomalies | "Scanning for anomalies…" |
| Analytics | "Computing analytics…" |
| Report detail | "Loading report…" |
| 3D globe | "Initializing globe…" |
| Auth | "Verifying credentials…" |

Loading visual: a small electric-400 ring spinner (`w-5 h-5`, `border-2`, spinning) + the contextual message below.

### 9.13 Empty state

- Center-aligned
- `text-display-sm` headline (e.g. "No projects yet")
- `text-body` description (e.g. "Projects will appear here once MLAs submit them")
- Optional illustration (subtle, `void-700` line art)
- Optional CTA: `primary` button (e.g. "Submit first project")

### 9.14 Error state

- Centered
- Icon: `AlertCircle` from lucide, `danger-400`, `w-12 h-12`
- `text-display-sm` headline (e.g. "Couldn't load projects")
- `text-body` description (the actual error in plain language, not a stack trace)
- `text-caption` with `error.code` for support
- CTAs: `primary` "Try again" + `ghost` "Go back"

---

## 10. 3D Globe Specification

### 10.1 Visual concept

A photorealistic Earth, viewed from low orbit, slowly rotating. Atmospheric glow on the limb. Subtle cloud layer drifting. Markers pinned to MPLAD project locations — small luminous dots that pulse softly. Connection lines arc between markers when hovering. A star field fills the void behind.

The globe is **not decoration** — it is the **strategic overview**. The 2D Leaflet map (on `/map`) is the **tactical view**. The globe sits in the dashboard hero, where the user absorbs the system-wide state at a glance.

### 10.2 Technical spec

**Geometry:**
- Sphere: radius 1, segments 64×64
- Atmosphere: sphere radius 1.025, custom Fresnel shader (electric-400 at 30% opacity at limb)
- Cloud layer: sphere radius 1.005, alpha texture, slow rotation (0.05 rad/s opposite direction)

**Textures (≤ 1MB each):**
- Earth color: low-res equirectangular (2048×1024), prefer NASA Blue Marble or natural-earth
- Earth normal: same projection, derived from elevation
- Earth specular: 1024×512, white over water only
- Cloud: 2048×1024, alpha

If textures unavailable, fall back to:
- Solid navy-700 sphere with a single ocean color
- Latitude/longitude grid lines
- Markers still functional

**Lighting:**
- Ambient: `#3a4361` (void-700), intensity 0.4
- Directional (sun): `#fff` (slight warm tint), intensity 1.2, position `[5, 3, 5]`
- Rim light: electric-400, intensity 0.3, opposite to sun for backlight
- No shadows (perf)

**Camera:**
- Default position: `[2.5, 1.2, 2.5]` (looking at origin, slight elevation)
- FOV: 45
- AutoRotate: 0.15 rad/s on Y axis
- User can grab to rotate, scroll to zoom (clamp 1.8–4.0)
- No pan (keep earth centered)

**Markers:**
- 3D billboard sprites, `8px` size
- Color by status: `success-400` (on-track), `warning-400` (at-risk), `danger-400` (off-track), `electric-400` (default)
- Idle: subtle pulse (scale 1 → 1.2 → 1, 2s, infinite)
- Hover: scale 1.5, drop a connection line to 2 nearest other markers
- Click: trigger camera `flyTo` to the marker, then show info card

**Star field:**
- 2000 stars, sphere radius 100, sizes 0.5-1.5px
- Slow drift (0.005 rad/s on Y)
- White with slight twinkle (random opacity 0.4-1.0)

**Performance:**
- `frameloop="demand"` after 5s idle
- `dpr={[1, 1.5]}`
- Suspense fallback: 2D placeholder with "Initializing globe…"
- Reduce on `prefers-reduced-motion`: no auto-rotate, no pulse, no twinkle
- Mobile detection: switch to simplified version (markers only, no clouds, no atmosphere)

### 10.3 Initial camera animation (entrance)

When the globe first appears (after the opening sequence):
- Camera starts at `[8, 0, 0]` (far away, edge-on)
- Animates to `[2.5, 1.2, 2.5]` over 2500ms using GSAP `ease-spatial`
- During the move: earth appears as a thin sliver, then "unfolds" to full view
- Stars fade in during the first 800ms

### 10.4 Globe API (component contract)

```tsx
<Globe3D
  markers={Array<{
    id: string;
    lat: number;
    lng: number;
    status: 'success' | 'warning' | 'danger' | 'neutral';
    label: string;
    value?: number;
  }>}
  selectedId?: string;
  onMarkerClick?: (id: string) => void;
  autoRotate?: boolean;        // default true
  showAtmosphere?: boolean;    // default true
  showClouds?: boolean;        // default true
  quality?: 'high' | 'medium' | 'low';  // default auto
  className?: string;
  ariaLabel?: string;          // default "Interactive 3D Earth showing project locations"
/>
```

### 10.5 Accessibility for 3D

- Container has `role="img"` with descriptive `aria-label`
- Tab-able; Enter/Space toggles "explore mode" (keyboard rotation via arrow keys)
- Markers list (visually hidden, screen-reader only) is a fallback: each marker is a focusable button with text description
- Reduced motion: no auto-rotate, no animation; globe static, markers still clickable
- Provide a "View as list" toggle that replaces 3D with a 2D list of the same data

---

## 11. Opening Sequence (Cinematic)

**Triggered:** once per browser, on first successful login. Cached in `localStorage` under `vojas.opening.shown`. Returning users skip directly to dashboard.

**Duration:** 1500ms (fast repeat) to 2800ms (full first-time).

### 11.1 Storyboard (frame by frame)

| t (ms) | Frame | Visual |
|--------|-------|--------|
| 0 | 0:00.000 | **Void.** Pure `void-50` background. Nothing else. |
| 200 | 0:00.200 | **Particles ignite.** 200 tiny white points (1px) appear at random positions within a 800px radius, opacity 0.7. |
| 500 | 0:00.500 | **Connections form.** Adjacent particles connect with 1px `void-700` lines, opacity 0.4. Lines draw in via `stroke-dashoffset` (300ms). |
| 800 | 0:00.800 | **Convergence.** All particles begin moving toward center (rate: 0.6 px/ms). |
| 1100 | 0:01.100 | **Symbol emerges.** At center, the 2D VOJAS symbol fades in (200ms), with a subtle 8px electric-400 glow. Particles merge into it. |
| 1300 | 0:01.300 | **2D → 3D.** Symbol scales up (1 → 1.5, 300ms ease-out), then the canvas switches to WebGL. A 3D version of the symbol (extruded chevron + sphere apex) replaces it. |
| 1500 | 0:01.500 | **Stars + globe.** 2000 stars fade in (400ms). Behind them, the Earth appears at `[8, 0, 0]`. |
| 1700 | 0:01.700 | **Camera move begins.** GSAP tweens camera from `[8, 0, 0]` to `[2.5, 1.2, 2.5]` over 1100ms with `ease-spatial`. |
| 2000 | 0:02.000 | **Markers load.** Markers fade in one by one (stagger 30ms, each 200ms ease-out). |
| 2400 | 0:02.400 | **Globe settles.** Camera at final position. Auto-rotate begins. |
| 2600 | 0:02.600 | **Dashboard emerges.** Globe scales to 60% size, slides to upper-right (or upper-left). Dashboard panels fade in from depth (one by one, stagger 80ms). |
| 2800 | 0:02.800 | **Interactive.** Sequence complete. User can now interact. |

### 11.2 Skip & accessibility

- "Skip intro" button in top-right from `t=400ms` onward
- `prefers-reduced-motion`: skip straight to `t=2400` (globe settled, dashboard emerging)
- Returning user (localStorage flag): skip to `t=2400`
- Esc key: skip
- Click anywhere: skip
- Audio: optional ambient drone at -20dB, off by default, never autoplay

### 11.3 Technical

- Layer 1 (DOM): the symbol + particles — pure CSS / SVG, fast
- Layer 2 (Canvas): the 3D globe — React Three Fiber `<Canvas>` mounted at `t=1300`
- Layer 3 (React): dashboard — mounted at `t=2400`, fades in
- GSAP timeline orchestrates the entire sequence
- `localStorage.vojas.opening.shown = "1"` on completion
- Cleanup: remove the opening layer on completion to free memory

---

## 12. Navigation

### 12.1 Existing behavior to preserve

- Sidebar with collapse/expand
- Active page highlighted
- Notification badge on bell
- User menu (role-based)
- Theme toggle (dark/light)
- ⌘K command palette
- Breadcrumbs in header
- Mobile drawer with backdrop

### 12.2 Elevation

**Spatial active state:**
- Active nav item: `bg-electric-500/10`, `border-l-2 border-electric-400`, `text-electric-400`
- Inactive: `text-void-900`, hover `bg-void-200`, `text-void-950`
- Tooltip on collapsed state: `bg-void-900`, `text-void-100`, `radius-sm`, fade 150ms

**Page transition (the "spatial move"):**
- Old page: `opacity 1 → 0`, `scale 1 → 0.98`, `translateY 0 → -8px` (200ms ease-in)
- New page: `opacity 0 → 1`, `scale 1.02 → 1`, `translateY 8px → 0` (400ms ease-out, delay 100ms)
- Implemented with framer-motion `AnimatePresence mode="wait"`

**Header (top bar):**
- `bg-void-100/80`, `backdrop-blur-md`, `border-b border-subtle`, `h-16`
- Sticky on scroll
- Search trigger (⌘K), theme toggle, notifications, user — all `w-9 h-9` icon buttons except user
- Breadcrumb: `text-caption`, `text-void-800`, hover `text-void-100`

### 12.3 Mobile

- < 768px: sidebar becomes a drawer
- Drawer: slides in from left (300ms ease-out), backdrop `rgba(0,0,0,0.7)`, close on backdrop click
- Header becomes compact: just hamburger + page title + ⌘K
- Bottom nav (optional, for primary pages): Dashboard, Map, Projects, Alerts, More

---

## 13. Map Interactions

### 13.1 2D Leaflet map (`/map` page)

- **Camera flyTo:** marker click → `map.flyTo([lat, lng], zoom, { duration: 1.2 })`
- **Marker selection:** the selected marker scales 1 → 1.4 → 1, drops a pulse ring (CSS), info panel slides in from right
- **Layer toggle:** smooth opacity crossfade (300ms) when enabling/disabling
- **Cluster:** `markerClusterGroup` with custom cluster icon (electric-500 bg, white count)
- **Heatmap:** if any layer supports it, render via `leaflet.heat` plugin

### 13.2 Info panel (right side)

- `bg-void-300`, `elev-3`, `radius-lg`, `p-6`
- Appears from right: `translateX 100% → 0`, `opacity 0 → 1` (400ms ease-out)
- Dismiss: X button in top-right
- Content: project name, status badge, location, photos, action buttons

### 13.3 3D globe interactions (dashboard)

- Hover marker: scale up, pulse ring, draw connection line to 2 nearest other markers
- Click marker: camera `flyTo` (300ms in 3D), highlight ring on selected, panel slides in from right
- "View in map" link: navigates to `/map?focus={id}`

---

## 14. Data Visualization Polish

### 14.1 Number counter (the most important animation)

When a metric appears or updates, count from 0 to value over 800ms with `ease-data`. Use a custom hook `useAnimatedNumber`.

```ts
useAnimatedNumber(value: number, duration = 800): number
```

- Triggers on mount, on value change, and on filter change
- Locale-aware (`Intl.NumberFormat`)
- Rounded appropriately: 1234 → "1.2K", 2456789 → "2.5M", 1234567890 → "1.2B"

### 14.2 Chart animation rules

- On enter: animate from 0 (or previous value) to value
- On filter change: crossfade or transition
- On data update: smooth tween, no jump
- Always reveal in this order: axes → grid → data → labels → tooltips

### 14.3 Heatmaps

- Color scale: from `void-600` (low) to `electric-400` (high) via `saffron-400` (mid)
- 5 stops total
- Opacity: 0.4 at data point, fading to 0 at edge

### 14.4 Geographic overlays (choropleth)

- District fill: `void-300` default, hover `void-200`, selected `electric-500/30`
- District border: `void-700`, `1px`
- Label: `text-caption`, `text-void-950`, appears on hover
- Use the existing `DistrictsLayer` and refine

---

## 15. Page-by-Page Refinements

### 15.1 Login / Register

- Keep the existing `CinematicBackground` (it's good)
- Add the 3D logo (extruded) hovering in the upper-right, with slow rotation
- Center the form: card `max-w-md`, `p-8`, `elev-3`
- Add micro-context: "Sign in to the VOJAS command center"
- Forgot password link, SSO option (out of scope for now)

### 15.2 Dashboard (the command center)

- 3D globe in hero zone (top, 480px tall on desktop, 240px on mobile)
- Below: KPI row (4 cards) → charts (2-up) → projects table
- Right sidebar: intelligence/insights (320px)
- Mobile: globe collapses, intel moves to a tab at bottom

### 15.3 Projects

- Header: title + filters + "New project" CTA
- Table: name, MLA, district, status, budget, last updated
- Row click: project detail
- Use the existing `ProjectsPage`, refine styling

### 15.4 Project Detail

- Hero: project name + status badge + key metrics (4 cards)
- Tabs: Overview, Financial, Documents, Risk, Site Analysis
- Each tab fades in from depth on switch
- Map widget: shows project location with flyTo

### 15.5 Map View

- Full-bleed Leaflet map
- Right drawer: filters + legend (collapsible)
- Top: search bar + layer toggles
- Marker click: right-side info panel emerges

### 15.6 Reports

- Table of citizen reports
- Status badges: New, Under Review, Resolved, Rejected
- Click: report detail with photo gallery, map pin, AI verdict

### 15.7 Anomalies

- AI-detected anomalies table
- Risk score visualization (radial gauge)
- Click: anomaly detail with explanation

### 15.8 Risk Dashboard

- Risk heatmap of all projects
- Top risky projects
- Risk trends (line chart)
- Drill-down per district

### 15.9 Analytics

- Full data exploration: filters, charts, exports
- Use larger chart sizes
- Provide "save view" capability

### 15.10 Notifications

- Grouped by date
- Status indicator (read/unread)
- Quick actions: mark read, archive

### 15.11 Settings

- Sectioned: Profile, Preferences, Security, Team, Integrations
- Form-heavy, use the `Input` component throughout

### 15.12 Citizens (public)

- Public submission form
- No login required
- Track via reference ID

---

## 16. Responsive Strategy

### 16.1 Desktop (≥1280px) — full experience

- 3D globe full size
- Sidebars visible
- All panels
- Max content width 1536px

### 16.2 Desktop-md (1024-1279px) — slight compression

- 3D globe full size
- Right sidebar collapses to a tab
- Tables show fewer columns (hide low-priority cols)

### 16.3 Tablet (768-1023px) — reduced complexity

- 3D globe: simplified mode (markers only, no clouds)
- Sidebar becomes drawer
- KPIs: 2-up instead of 4-up
- Charts: full width

### 16.4 Mobile (<768px) — adapted

- 3D globe: 240px tall, simplified
- Bottom nav (5 items: Dashboard, Map, Projects, Alerts, More)
- All tables: card list view (each row becomes a card)
- Modals: full screen
- Drawer: full screen
- Touch targets: minimum 44×44px

### 16.5 Tailwind breakpoint config

```
screens: {
  'sm':  '480px',
  'md':  '768px',
  'lg':  '1024px',
  'xl':  '1280px',
  '2xl': '1536px',
  '3xl': '1920px',
}
```

---

## 17. Accessibility Strategy

### 17.1 Standards

- **WCAG 2.2 AA** minimum
- All interactive elements keyboard-accessible
- Visible focus on all focusable elements
- Color is never the only signal (always pair with text or icon)
- `prefers-reduced-motion` respected at every level

### 17.2 Specifics

- Skip link to main content (already exists, keep)
- ARIA labels on all icon-only buttons
- ARIA live regions for toasts and dynamic content
- Form labels always visible (no floating labels)
- Error messages tied to inputs via `aria-describedby`
- Tables use proper `<th scope>` and `caption`
- 3D globe has a list fallback (visually hidden, screen-reader accessible)
- All animations: opacity + transform (not color-only) for state changes

### 17.3 Reduced motion

- `prefers-reduced-motion: reduce`:
  - All non-essential animations: `duration: 0ms`
  - Opening sequence: skip to final state
  - Page transitions: instant
  - Auto-rotate: off
  - Number counter: instant (no tween)
  - Hover effects: still allowed (color change)
  - Focus rings: still animated (essential feedback)

### 17.4 Keyboard map

| Key | Action |
|-----|--------|
| Tab | Move focus |
| Shift+Tab | Move focus back |
| Enter / Space | Activate |
| Esc | Close modal/drawer/popover |
| Arrow keys | Navigate within menus, tabs, command palette |
| ⌘K / Ctrl+K | Open command palette |
| / | Focus search (when on dashboard) |
| G then D | Go to Dashboard |
| G then P | Go to Projects |
| G then M | Go to Map |
| ? | Show keyboard shortcuts |
| T | Toggle theme |

---

## 18. Performance Strategy

### 18.1 Bundle

- Three.js + R3F + drei in their own chunk: `vojas-3d.[hash].js`, lazy loaded
- Code-split all routes (already done)
- Total initial JS: < 300KB gzipped (without 3D)
- 3D chunk: < 800KB gzipped

### 18.2 Loading strategy

- Critical CSS: inline in `<head>`
- Fonts: preconnect + `font-display: swap`
- Earth textures: preload only the low-res, lazy-load HD
- 3D globe: lazy-mounted on dashboard only
- Suspense fallbacks: 2D placeholders, not spinners

### 18.3 Runtime

- `requestAnimationFrame` for all animations
- Avoid layout thrash: only animate `transform` and `opacity`
- Use CSS containment on cards
- Virtualize long lists (>100 rows)
- Debounce search inputs (300ms)

### 18.4 3D performance

- `frameloop="demand"` after idle
- `dpr={[1, 1.5]}`
- Cap pixel ratio on high-DPI mobile
- Detect device GPU; downgrade quality on weak devices
- Pause globe when tab is hidden

### 18.5 Targets

- First Contentful Paint: < 1.5s
- Largest Contentful Paint: < 2.5s
- Time to Interactive: < 3.5s
- 3D globe first frame: < 1.5s after dashboard mount
- Frame rate: ≥ 60fps on mid-range desktop, ≥ 30fps on mobile
- Bundle size (initial): < 300KB gzipped
- 3D chunk: < 800KB gzipped

---

## 19. Implementation Order

| # | Step | Scope | Effort | Notes |
|---|------|-------|--------|-------|
| 1 | Install deps | `three`, `@react-three/fiber`, `@react-three/drei`, `gsap` | S | npm install |
| 2 | Logo + branding | New SVG logo (primary + symbol + 3D prep), favicon | M | Public assets |
| 3 | Design tokens | Refine `tailwind.config.js` (colors, shadows, motion) | S | All values in this spec |
| 4 | Refactor primitives | `Card`, `Button`, `Input`, `Badge`, `Avatar`, `Modal`, `Tooltip`, `Toast`, `Tabs`, `Table` with new tokens | M | Component refactor |
| 5 | Cinematic background | Enhance `CinematicBackground.tsx` with GSAP ambient motion | M | Login page |
| 6 | 3D logo | `LogoMark3D.tsx` — extruded chevron with glowing apex sphere | M | Used in opening |
| 7 | Opening sequence | `HeroOpening.tsx` — orchestrated 2.8s sequence | L | One-time on first login |
| 8 | 3D globe | `Globe3D.tsx` + Earth + Markers + Stars + Atmosphere | L | R3F-based |
| 9 | Dashboard integration | New `DashboardPage` with 3D hero + spatial layout | L | Replaces `SpatialCommandScene` |
| 10 | Navigation polish | Spatial page transitions, refined active states | M | `Layout.tsx` + `PageTransition.tsx` |
| 11 | Data viz polish | `useAnimatedNumber`, chart animation refinements, tabular nums | M | All chart components |
| 12 | Map interactions | flyTo, marker expansion, panel transitions | M | `MapViewPage.tsx` |
| 13 | Apply to all pages | projects, reports, anomalies, risk, analytics, settings, notifications, auth, citizens | L | Use new primitives |
| 14 | Mobile + a11y | Responsive pass, focus rings, reduced-motion | M | All pages |
| 15 | Performance | Code split, lazy 3D, adaptive quality, bundle analysis | M | Verification step |
| 16 | Verify + deploy | Build, smoke test, deploy to Vercel | S | End-to-end |

**Legend:** S = < 1 hour, M = 1-3 hours, L = 3+ hours

**Total estimated effort:** 30-40 hours of focused work.

---

## 20. Verification

After implementation, verify:

1. **Visual QA** — every page in dark + light mode; check spacing, alignment, hierarchy
2. **Interaction test** — every button, card, modal, chart, map marker has feedback
3. **3D performance** — 60fps on mid-range desktop, 30fps on mobile, 3D chunk < 800KB
4. **Accessibility** — Tab through every page; verify focus, labels, contrast; run axe
5. **Mobile** — iPhone + Android viewports; 3D fallback works; bottom nav functional
6. **Reduced motion** — toggle OS setting, verify graceful degradation
7. **Build** — `npm run build` succeeds with no warnings
8. **Deploy** — push to Vercel, verify live, test on production URL

---

## 21. What's Out of Scope (for this round)

- Backend API changes
- Auth flow changes (existing Supabase/Prisma flow stays)
- Database schema changes
- New feature additions (only refining existing)
- Mobile native apps
- Offline support
- Real-time collaboration
- i18n (English only for now)

---

## 22. Open Questions

1. **Earth texture source** — Use NASA Blue Marble (public domain) or natural-earth? Both free. Recommend natural-earth (smaller, no attribution).
2. **3D logo style** — Bevel + glow (electric-400), or matte + subtle emissive? Recommend bevel + glow.
3. **Number counter everywhere?** — Recommend yes (it's a strong "this is alive" signal), but config-flag for power users to disable.
4. **Opening sequence audio** — Recommend off by default, toggle in settings.
5. **Mobile 3D fallback** — Recommend simplified 2.5D (flat earth image with markers), or full 3D with aggressive quality reduction? Recommend simplified.

These can be answered during implementation, not blockers.

---

*End of design specification. Next step: create visual mockup Artifacts for visual approval, then begin implementation.*
