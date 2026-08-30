# VOJAS — Accountability Platform for MPLAD Scheme

> **SIH 2026** | Theme: Smart Automation | Category: Blockchain & Cybersecurity  
> Problem Statement: SIH26102 — AI-Powered Anomaly Detection in MPLAD Scheme

## Motto
**VOJAS — ACCOUNTABILITY**

## What is VOJAS?

VOJAS is an AI-powered accountability platform that helps detect **anomalies, fraud indicators, financial irregularities, project delays, and implementation inefficiencies** in the Members of Parliament Local Area Development Scheme (MPLADS).

The system combines official project data, geospatial analysis, citizen reports, document intelligence, and multi-signal AI to flag suspicious patterns for authorized verification — without falsely accusing anyone.

> **🎬 5-Minute Demo Script:** See [docs/DEMO.md](./docs/DEMO.md) for the SIH pitch walkthrough.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | React 19 + Vite + TypeScript + Tailwind CSS |
| **Backend** | Node.js + Express.js + TypeScript |
| **Database** | SQLite (dev) / PostgreSQL (prod) via Prisma |
| **Maps** | Leaflet + React-Leaflet (free, open-source) |
| **Auth** | JWT + bcrypt |
| **Validation** | Zod |
| **State** | React Context + React Query (planned) |
| **Testing** | Vitest + Jest (planned) |
| **Deployment** | Vercel (FE) + Render (BE) (planned) |

See [`docs/DECISIONS.md`](./docs/DECISIONS.md) for detailed reasoning.

## Project Structure

```
VOJAS/
├── frontend/      React + Vite client app
├── backend/       Express + Prisma API server
├── docs/          Project documentation
├── scripts/       Utility scripts
├── .github/       CI workflows
├── .env.example   Environment variable template
├── docker-compose.yml   Production stack (PostgreSQL + backend + nginx)
├── backend/Dockerfile
├── frontend/Dockerfile
├── frontend/nginx.conf
├── .gitignore
└── README.md
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm 9+
- Git

### Installation
```bash
# 1. Clone
git clone https://github.com/YOUR_USERNAME/vojas.git
cd vojas

# 2. Setup environment
cp .env.example .env

# 3. Install backend
cd backend
npm install
npx prisma generate
npx prisma db push

# 4. Install frontend
cd ../frontend
npm install
```

### Run Development
```bash
# Terminal 1: Backend (port 5000)
cd backend
npm run dev

# Terminal 2: Frontend (port 5173)
cd frontend
npm run dev
```

Visit: **http://localhost:5173**

### Run with Docker (production stack)
```bash
docker compose up --build
```

Visit: **http://localhost** (frontend) and **http://localhost/api/v1** (backend)

See [docs/DOCKER.md](./docs/DOCKER.md) for full deployment guide.

## Documentation

- 📄 [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) — Current project state (read first when resuming)
- 🎬 [docs/DEMO.md](./docs/DEMO.md) — 5-minute SIH pitch script + judge Q&A
- 🏛️ [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture
- 🗺️ [docs/ROADMAP.md](./docs/ROADMAP.md) — 15-phase development roadmap
- 💡 [docs/DECISIONS.md](./docs/DECISIONS.md) — Architecture decision records
- 🛠️ [docs/SETUP.md](./docs/SETUP.md) — Detailed setup guide
- 📡 [docs/API.md](./docs/API.md) — API documentation
- 💾 [docs/DATABASE.md](./docs/DATABASE.md) — Database schema plans
- 🔒 [docs/SECURITY.md](./docs/SECURITY.md) — Security posture, threat model, PII redaction

## Key Features (Built)

- ✅ Project registry with status, location, budget (Phase 4)
- ✅ Leaflet-based geospatial map view with clustering + risk overlay (Phase 5)
- ✅ Citizen complaint reporting with photo/PDF attachments + **PII auto-redaction** (Phase 6 + 8 + 13)
- ✅ Financial tracking — budget + expenditure ledger + 5-stage fund flow (Phase 7)
- ✅ AI-based anomaly detection — 6 rules engine (Phase 9)
- ✅ Risk scoring with explainable **4-signal breakdown** (Anomaly / Financial / Reports / Timeline) (Phase 10)
- ✅ **AI Verdict panel** with confidence ring, contributing factors, and recommendation (Phase 11)
- ✅ Analytics dashboard with charts (Phase 13)
- ✅ Spatial 3D command map, ⌘K command palette, cinematic transitions, **4-step guided demo tour** (Phase 14)
- ✅ Officer verification workflow (acknowledge/resolve)
- ✅ Audit trail with PII access logging
- ✅ 16-sector monitoring (Public Works, Health, Education, etc.)
- ✅ Dark/light theme, mobile responsive
- ✅ Docker Compose production stack with PostgreSQL (Phase 15)
- ✅ Security: helmet, rate-limits, bcryptjs, JWT HS256, magic-byte file verify, password policy

## Phase Status

| Phase | Description | Status |
|-------|-------------|--------|
| 1 | Foundation | ✅ |
| 2 | UI Shell | ✅ |
| 3 | Authentication | ✅ |
| 4 | Project Management | ✅ |
| 5 | Location & Maps | ✅ |
| 6 | Citizen Reporting | ✅ |
| 7 | Financial Tracking | ✅ |
| 8 | Document Management | ✅ |
| 9 | Anomaly Detection | ✅ |
| 10 | Risk Scoring | ✅ |
| 11 | AI Integration (Local explainer) | ✅ |
| 12 | Layout/Theme Polish | ✅ |
| 13 | Analytics + PII Redaction | ✅ |
| 14 | Spatial UI + Demo Tour | ✅ |
| 15 | Deployment + Security Hardening | ✅ |

## Safety Principle

> VOJAS identifies **possible anomalies** and provides **evidence + risk indicators**.  
> AI scores are **NOT** proof of fraud.  
> Final verification and legal action remain with **authorized government authorities**.

## License
Internal — Smart India Hackathon 2026
