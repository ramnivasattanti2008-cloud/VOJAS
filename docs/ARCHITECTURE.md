# VOJAS Architecture

## Overview
VOJAS is a **full-stack web application** with a clear separation between frontend and backend layers.

```
┌─────────────────────────────────────────────┐
│              CLIENT LAYER                    │
│  React 19 + Vite + TypeScript + Tailwind    │
│  Leaflet (maps) · Recharts (analytics)      │
└──────────────────┬──────────────────────────┘
                   │ REST API (JSON)
                   │  CORS · JWT Auth
┌──────────────────▼──────────────────────────┐
│              API LAYER                       │
│  Express.js + TypeScript                     │
│  Zod validation · JWT middleware            │
│  Error handling middleware                   │
└──────────────────┬──────────────────────────┘
                   │ Prisma Client
┌──────────────────▼──────────────────────────┐
│              DATA LAYER                      │
│  SQLite (dev) → PostgreSQL (production)     │
│  Prisma ORM · Migrations                     │
└─────────────────────────────────────────────┘
```

## Layer Responsibilities

| Layer | Responsibility |
|-------|---------------|
| Client | UI rendering, user input, state management, API calls |
| API | Request validation, auth, business logic, error handling |
| Data | Persistent storage, queries, migrations, relations |

## Key Design Decisions

- **TypeScript end-to-end**: Shared types between frontend and backend via `@vojas/shared` (future)
- **Prisma ORM**: Type-safe database access with auto-generated client
- **Modular backend**: Each domain has its own routes/controllers/services/models
- **REST API**: Clean conventions (`/api/v1/resource`)
- **Leaflet for maps**: Free, no API key, swap to Google Maps later

## Future Evolution (documented in DECISIONS.md)
- Add Redis caching layer
- Add message queue (Bull/BullMQ) for AI processing
- Migrate SQLite → PostgreSQL
- Add Docker Compose for full local stack
- Add microservices for heavy workloads
