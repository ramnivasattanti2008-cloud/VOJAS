# VOJAS — Tooling Audit (2026-09-02)

Snapshot of every recommended tool from the VOJAS tool policy, mapped to
what's actually installed in this repo. Per the **Tool Discovery Rule**,
nothing on the recommended list is added blindly — we check
`package.json`, installed plugins, and existing project dependencies
first.

## Audit table

| # | Tool | Status | Where | Notes |
|---|---|---|---|---|
| 1 | GitHub | ✅ In use | origin/master | Free |
| 2 | Vercel | ✅ In use | vojas-frontend.vercel.app | Free tier |
| 3 | PostgreSQL | ✅ In use | `backend/prisma/schema.postgres.prisma` | Production |
| 4 | PostGIS | ❌ Not in use | — | See "PostGIS" below |
| 5 | Prisma | ✅ v6 | `backend/prisma/schema.prisma` | Free / open source |
| 6 | Google Earth Engine | ⚠️ REQUIRES VERIFICATION | — | See "Earth Engine" below |
| 7 | Sentinel-2 / Copernicus | ✅ In use | `scripts/ingest/pilotProjects.ts` | Free / open data via CDSE |
| 8 | Google Maps Platform | ❌ Not in use | — | See "Maps" below |
| 9 | Leaflet + OpenStreetMap | ✅ In use | `frontend/src/components/` | Free / open source |
| 10 | Turf.js | ✅ Added today | `frontend/src/utils/geo.ts` | Free / MIT |
| 11 | Playwright | ✅ Added today | `frontend/playwright.config.ts`, `frontend/e2e/` | Free / open source |
| 12 | Sentry (FE) | ✅ Added today | `frontend/src/main.tsx` | Free tier (5K events/month) |
| 13 | Sentry (BE) | ✅ Added today | `backend/src/server.ts` | Free tier |
| 14 | Three.js + R3F + Drei | ✅ In use | `frontend/src/components/3d/` | Free / open source |
| 15 | Motion (framer-motion) | ✅ In use | `frontend/src/` | Free / open source |
| 16 | GSAP | ✅ In use | `frontend/src/` | Free tier |
| 17 | Vercel AI SDK | ❌ Not in use | — | See "AI SDK" below |
| 18 | OpenAI (provider) | ⚠️ Active, paid | `backend/src/lib/ai.ts` | See docs/PAID-DEPENDENCIES.md |
| 19 | Groq (provider) | ⚠️ Available, free tier | `backend/src/lib/ai.ts` | Recommended for dev |
| 20 | Ollama (provider) | ⚠️ Available, free | `backend/src/lib/ai.ts` | Local-only, fully free |
| 21 | Figma | N/A | — | Design app, not a code dep |

## PostGIS — decision

**Status:** Not in use.
**Why not:** PostGIS requires a schema migration (switching Prisma spatial
columns to `Unsupported` types), a database migration to add the
`postgis` extension, and a backfill of 60,367 geocoded projects. Turf.js
in JS handles the spatial queries VOJAS currently needs (point-in-polygon
for district choropleth, distance between projects) at our current scale.

**When to revisit:** If spatial queries become a measured bottleneck —
e.g. a "find all projects within 5km of X" that takes >1s in JS — then
PostGIS is the right answer. For now, Turf is enough.

## Earth Engine — REQUIRES VERIFICATION

**Status:** Not installed. Sentinel-2 via CDSE is the current satellite
data path.
**Why held back:** Earth Engine requires (1) registration at
`code.earthengine.google.com`, (2) Google's individual approval for
research/non-commercial use, (3) a Google Cloud project + service
account JSON, and (4) compliance with Google's terms (not "open
source"). The CDSE path is genuinely free and open, with no approval
required, so it's the primary path.

**When to revisit:** If we need an analysis that CDSE raw products
don't offer — e.g. NDVI time series, atmospheric correction, cloud
masking — at production quality. Then invest in the Earth Engine
setup.

## Maps — decision

**Status:** Leaflet + OpenStreetMap is in use. Google Maps Platform is
**deliberately not integrated**.
**Why not:** OSM tiles + Leaflet cover all of VOJAS's mapping needs
(district choropleth, project locations, MP geographies). Adding Google
Maps would require a Google Cloud billing account and pay-per-load
pricing, with no feature gain for our current scope.

**When to revisit:** If a future feature genuinely needs Google-quality
Street View, 3D photorealistic tiles, or Places API autocomplete that
the free alternatives don't cover.

## AI SDK — decision

**Status:** Vercel AI SDK is not installed. The backend uses
`openai` directly, wrapped in a custom provider abstraction at
`backend/src/lib/ai.ts`.
**Why:** The provider abstraction (`openai | groq | ollama`) covers
what Vercel AI SDK would have given us (streaming, swappable
providers) with one less dependency. Adopting Vercel AI SDK is a
refactor, not a feature add, so it's deferred until the abstraction
itself becomes a maintenance burden.

## Free-first development strategy — recap

Build order that VOJAS follows:

1. PostgreSQL/PostGIS (when needed) + Prisma + Next.js/Vite
2. GitHub + Vercel + free-tier hosting
3. Open/public geospatial data (Sentinel-2 via CDSE, OSM tiles, LGD,
   data.gov.in)
4. Open-source geospatial processing (Turf.js, eventually GDAL)
5. Free-tier monitoring (Sentry) and testing (Vitest, Playwright)
6. Paid services **only** after measuring genuine need

## How to extend this audit

When you add a new tool, update this table and (if it's paid) add an
entry to `docs/PAID-DEPENDENCIES.md` with the 6-question verification
checklist from that doc.
