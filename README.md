# VOJAS — AI Accountability Platform for MPLAD Scheme

> 🏆 **Smart India Hackathon 2026 Finalist** | 🌐 **Live at [vojas-frontend.vercel.app](https://vojas-frontend.vercel.app)**

VOJAS is an AI-powered government accountability platform that tracks MPLAD (Member of Parliament Local Area Development) scheme projects across India using satellite imagery analysis, risk detection, and public transparency.

## What It Does

- 🛰️ **Satellite Change Detection** — Real-time Sentinel-2 satellite imagery analysis
- 🚨 **7-Signal Risk Engine** — AI-powered anomaly detection with correlation analysis
- 🗺️ **Geospatial Intelligence** — Interactive maps with 60,000+ geocoded projects
- 📊 **Time Machine** — Before/after satellite comparison with playback controls
- 🔍 **Change Analysis** — Automated change detection with confidence scoring
- 🏛️ **Public Transparency** — Citizen-facing dashboards and project tracking

## Monorepo Structure

- `apps/web/` — Next.js 15 App Router frontend
- `apps/api/` — Express.js REST API
- `packages/db/` — Prisma schema, migrations, PostgreSQL access
- `packages/domain/` — Zod schemas, domain services, geospatial utilities, provider interfaces
- `packages/api-client/` — Typed API client for the frontend
- `packages/shared/` — Shared enums, constants, types

## Quick Start (development)

```bash
# Install dependencies for all workspaces
npm install

# Set up environment
cp .env.example .env
# Edit .env with your PostgreSQL connection string

# Generate Prisma client + run migrations
npm run db:migrate -w @vojas/db
npm run db:seed -w @vojas/db

# Start the API and Web
npm run dev
```

- API: http://localhost:5000
- Web: http://localhost:3000

## Architecture

See `docs/rebuild/ARCHITECTURE.md` for the complete architecture documentation.

## Database

PostgreSQL 14+ with PostGIS extension. The schema is in `packages/db/prisma/schema.prisma`.

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript, Tailwind CSS, TanStack Query
- **Backend**: Node.js, Express.js, TypeScript, Prisma ORM
- **Database**: PostgreSQL 14+ with PostGIS
- **Auth**: JWT + bcryptjs
- **Validation**: Zod (shared between FE and BE)
- **Testing**: Vitest (unit + integration), Playwright (E2E)

## Legacy

The previous single-app version is in `legacy/`.
