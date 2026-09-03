# VOJAS 2.0 — Project Experience Design

> The Project is the core object of VOJAS. Every interaction should serve the investigation
> of a specific project's geographic and historical reality.

---

## 1. Concept

A professional **geospatial investigation workspace** — not a dashboard.
When a user opens a project, they should feel like an analyst with a live feed of
Earth-observation data, not like a user clicking through a generic admin panel.

The page feels like a **satellite mission control room**: dark surfaces, geographic
depth, precise labels, and a clear timeline of what happened when.

---

## 2. Layout structure

```
┌─ Header ──────────────────────────────────────────────────────────┐
│  VOJAS logo | Project name | Status badge | Actions             │
├──────────────────────────────────────────────────────────────────┤
│  Tabs: Overview | Location | Timeline | Satellite | Finance | …  │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Primary content area (full-width or 2/3 + 1/3 split)            │
│                                                                   │
│  On Satellite tab:                                                │
│    ┌─ Map (left, 65%) ──────────────┬─ Info panel (right, 35%)┤
│    │  OpenStreetMap / Satellite /    │  Observation card         │
│    │  Hybrid + project marker +      │  Evidence chain          │
│    │  earth-observation overlay       │  Metadata                │
│    └────────────────────────────────┴──────────────────────────┤
│                                                                   │
│  Timeline: Interactive time machine (drag to explore)              │
│  Weekly checkpoint bar: ● ● ● ● ● ○ ● ● ●                        │
│                                                                   │
├──────────────────────────────────────────────────────────────────┤
│  Bottom rail: Sync button | Observation count | Provider status     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 3. Time Machine interaction

The signature interaction. Drag the timeline to scrub through time:

1. User drags the timeline cursor.
2. Map updates to show the selected observation.
3. Observation card shows the selected scene's metadata.
4. If no observation exists for the date, show "No usable observation" with reason.
5. Map shows project marker even when no observation exists.

**Timeline rendering:**
- Horizontal bar with year tick marks
- Per-week tick marks (green = available, gray = unavailable)
- Draggable cursor snaps to nearest checkpoint
- Date labels above the bar
- Mobile: vertical scrollable timeline

---

## 4. Map behavior

- **Basemap options:** OpenStreetMap, Esri satellite, Hybrid
- **2D / 3D toggle:** Perspective view with pitch + bearing
- **Layers:** Project marker, observation footprint polygon, earth-observation WMS overlay
- **Interaction:** Click project marker to see popup with name + coordinates
- **Empty state:** Shows OpenStreetMap with project marker only
- **Satellite tiles:** CDSE WMS overlay when token + tileUrl are available

---

## 5. Observation card

Shows for the currently selected timeline position:

- Observation date + target date
- Cloud cover with quality badge
- Satellite + dataset
- Resolution
- Spectral indices (NDVI/NDBI/BSI) with honest framing
- Source link to CDSE catalogue
- Scene ID (monospace)

**Empty state:** Honest message — no fabricated imagery.

---

## 6. Progress comparison

Side-by-side:

| Reported Progress | Observable Change |
|---|---|
| 40% (bar) | MODERATE OBSERVABLE CHANGE |
| Government-reported | Satellite-derived |

With:
- Evidence confidence badge
- AI assessment paragraph
- Baseline → Latest dates
- Link to full evidence chain

---

## 7. Evidence chain

Visual 5-step trail:
1. **Source** — Sentinel-2 L2A from CDSE
2. **Observation** — Real captured scene
3. **Analysis** — Pairwise spectral change
4. **AI Finding** — Assessment + confidence
5. **Verification** — Officer sign-off

Each step is highlighted when its data exists, greyed when not yet available.

---

## 8. States

Every sub-component handles these states honestly:

| State | Visual |
|-------|--------|
| Loading | Skeleton matching the final layout, no fake values |
| Empty | Icon + honest headline + specific reason |
| Error | Icon + headline + retry button + last good data if available |
| Not configured | Banner explaining what env vars to set |
| No coordinates | Banner explaining why map/satellite unavailable |
| Sync in progress | Badge + job polling every 5s |
| Sync complete | Badge updates, data appears |

---

## 9. Responsive

- **Desktop (>1024px):** Map + info panel side by side
- **Tablet (768–1024px):** Map full-width above info panel
- **Mobile (<768px):** Vertical stack — map → timeline → observation → comparison

Time machine remains horizontally scrollable on mobile.

---

## 10. Trust signals

Every satellite result carries:
- Source attribution (Copernicus Data Space Ecosystem)
- Observation date (not fabricated)
- Cloud cover percentage (real from provider)
- Scene ID (traceable)
- Methodology statement
- Confidence level
- What it does NOT show (limitations)
