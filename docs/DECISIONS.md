# VOJAS Architecture Decisions

## Decision 1: Frontend Stack
**Technology**: React 19 + Vite + TypeScript + Tailwind CSS
**Reason**: Matches existing SIH project (SMRITI), team familiarity, excellent DX
**Alternative Considered**: Next.js (SSR complexity unnecessary), Angular (overkill for MVP)
**Why Selected**: Fast HMR, strong ecosystem, TS integration, Tailwind speeds up styling
**Cost**: $0 (open source)
**Future Scalability**: Can scale to large app, supports SSR if needed later

---

## Decision 2: Backend Stack
**Technology**: Node.js + Express.js + TypeScript
**Reason**: Matches frontend language (TypeScript end-to-end), async I/O great for REST APIs
**Alternative Considered**: Django/Flask (Python) — split language increases cognitive load
**Why Selected**: Single language for frontend/backend, Express is minimal and extensible
**Cost**: $0 (open source)
**Future Scalability**: Can add NestJS for structure, supports microservices

---

## Decision 3: Database
**Technology**: SQLite (dev) → PostgreSQL (production)
**ORM**: Prisma
**Reason**: SQLite zero-config for local dev, Prisma gives type-safe queries, PostgreSQL for production scale
**Alternative Considered**: MongoDB (less ideal for relational data), MySQL (simpler but Prisma is PostgreSQL-first)
**Why Selected**: SQLite perfect for hackathon/dev, Prisma migrations handle the PostgreSQL swap cleanly
**Cost**: $0 (both open source)
**Future Scalability**: PostgreSQL handles millions of records, Prisma scales with it

---

## Decision 4: Maps
**Technology**: Leaflet + React-Leaflet (free)
**Future**: Google Maps JavaScript API (production)
**Reason**: Leaflet requires no API key, works offline-friendly, swap is straightforward via environment variable
**Alternative Considered**: Mapbox (free tier attribution issues), Google Maps (requires billing account)
**Why Selected**: Zero friction for development, legal attribution only, can switch with one env var
**Cost**: $0 (Leaflet is BSD licensed)
**Future Scalability**: Google Maps handles production scale, Leaflet is development only

---

## Decision 5: Authentication
**Technology**: JWT + bcrypt
**Reason**: Stateless, simple for REST API, works well with React SPA
**Alternative Considered**: Sessions (requires Redis/session store), OAuth (adds complexity, overkill for MVP)
**Why Selected**: Self-contained tokens, easy to implement, can upgrade to refresh tokens later
**Cost**: $0
**Future Scalability**: JWT is standard, can add refresh token rotation, or migrate to session-based

---

## Decision 6: Validation
**Technology**: Zod (backend), React Hook Form (frontend)
**Reason**: Zod provides runtime + compile-time validation, integrates with TypeScript
**Alternative Considered**: Yup (older, less TypeScript-friendly), Joi (less type-safe)
**Why Selected**: Zod has better TypeScript inference, smaller bundle size
**Cost**: $0
**Future Scalability**: Scales to complex schemas easily

---

## Decision 7: State Management
**Technology**: React Context + useState (MVP), React Query (for server state)
**Reason**: App doesn't need Redux complexity yet, React Query handles caching/fetching well
**Alternative Considered**: Redux Toolkit (overkill), Zustand (good but React Query covers more cases)
**Why Selected**: Minimal boilerplate for MVP, React Query handles loading/error states automatically
**Cost**: $0
**Future Scalability**: Can add Redux for global state if complexity grows

---

## Decision 8: Testing
**Technology**: Vitest (frontend unit), Jest (backend), Playwright (E2E)
**Reason**: Vitest is Vite-native (faster), Jest is standard for Node.js
**Alternative Considered**: Mocha/Chai (older patterns), Cypress (paid for teams)
**Why Selected**: Fast, TypeScript support, standard tools
**Cost**: $0
**Future Scalability**: Covers unit to integration to E2E

---

## Decision 9: Deployment Target
**Technology**: Vercel (frontend) + Render/Railway (backend)
**Reason**: Free tiers available, easy GitHub integration, zero-config deployments
**Alternative Considered**: AWS/GCP (complex setup), Heroku (limited free tier)
**Why Selected**: Fastest path from code to deployed app, generous free tiers for hackathon
**Cost**: $0 (free tiers)
**Future Scalability**: Can migrate to VPS/Docker when traffic increases
