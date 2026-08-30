# VOJAS — Accountability Platform for MPLAD Scheme

> **SIH 2026** | Theme: Smart Automation | Category: Blockchain & Cybersecurity  
> Problem Statement: SIH26102 — AI-Powered Anomaly Detection in MPLAD Scheme

## Motto
**VOJAS — ACCOUNTABILITY**

## What is VOJAS?

VOJAS is an AI-powered accountability platform that helps detect **anomalies, fraud indicators, financial irregularities, project delays, and implementation inefficiencies** in the Members of Parliament Local Area Development Scheme (MPLADS).

The system combines official project data, geospatial analysis, citizen reports, document intelligence, and multi-signal AI to flag suspicious patterns for authorized verification — without falsely accusing anyone.

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
├── .env.example   Environment variable template
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

## Documentation

- 📄 [docs/PROJECT_STATE.md](./docs/PROJECT_STATE.md) — Current project state (read first when resuming)
- 🏛️ [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System architecture
- 🗺️ [docs/ROADMAP.md](./docs/ROADMAP.md) — 15-phase development roadmap
- 💡 [docs/DECISIONS.md](./docs/DECISIONS.md) — Architecture decision records
- 🛠️ [docs/SETUP.md](./docs/SETUP.md) — Detailed setup guide
- 📡 [docs/API.md](./docs/API.md) — API documentation
- 💾 [docs/DATABASE.md](./docs/DATABASE.md) — Database schema plans

## Key Features (Planned)

- ✅ Project registry with status, location, budget
- ✅ Citizen complaint reporting with photo/video
- ✅ AI-based anomaly detection (rule-based → ML)
- ✅ Risk scoring with explainable AI
- ✅ Multi-signal evidence (financial, geo, document, complaints)
- ✅ Officer verification workflow
- ✅ Audit trail
- ✅ 16-sector monitoring (Public Works, Health, Education, etc.)
- ✅ Real-time alerts and dashboards
- ✅ Map-based project visualization

## Safety Principle

> VOJAS identifies **possible anomalies** and provides **evidence + risk indicators**.  
> AI scores are **NOT** proof of fraud.  
> Final verification and legal action remain with **authorized government authorities**.

## License
Internal — Smart India Hackathon 2026
