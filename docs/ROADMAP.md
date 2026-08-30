# VOJAS Development Roadmap

## PHASE 1 — Foundation
> **Goal**: Running project, frontend + backend connected, database ready

- [x] Repository setup
- [x] Technology stack decision
- [x] Frontend foundation (Vite + React + TS + Tailwind)
- [x] Backend foundation (Express + TS + Prisma + SQLite)
- [x] Environment configuration (.env)
- [x] Frontend ↔ backend connection (health API)
- [x] Basic logging & error handling
- [x] Git initialization + first commit

---

## PHASE 2 — Core UI Shell
> **Goal**: Basic dashboard UI with navigation, no features yet

- [x] React Router setup
- [x] Layout (Sidebar, Header, Main Content Area)
- [x] Loading, Error, Empty state components
- [x] Dark theme foundation
- [x] Basic routing structure (Dashboard + placeholders)

---

## PHASE 3 — User Authentication
> **Goal**: Users can sign in with roles

- [x] User model (database) — User + AuditLog
- [x] User service (bcrypt password hashing)
- [x] Token service (JWT issuance + verification)
- [x] Auth controller (register, login, logout, me)
- [x] Auth middleware (authenticate, authorize)
- [x] Auth routes (`/api/v1/auth/*`)
- [x] Login page UI
- [x] Register page UI
- [x] Auth context (React state)
- [x] Protected routes (frontend)
- [x] Token persistence (localStorage)
- [x] Database seed (4 demo users)
- [x] Form validation (Zod backend)

---

## PHASE 4 — Project Management
> **Goal**: Core project CRUD, the foundation for everything else

- [ ] Project model (database)
- [ ] Project CRUD API
- [ ] Project list page
- [ ] Project detail page
- [ ] Project search & filter
- [ ] Project create/edit form
- [ ] Project status workflow

---

## PHASE 5 — Location & Maps
> **Goal**: Projects have coordinates, visible on map

- [ ] Location model
- [ ] Map integration (Leaflet + React-Leaflet)
- [ ] Project markers on map
- [ ] Click to view project details
- [ ] District/State boundaries
- [ ] Map filters

---

## PHASE 6 — Citizens & Reporting
> **Goal**: Citizens can submit reports/complaints

- [ ] Citizen report model
- [ ] Report submission API
- [ ] Report form UI
- [ ] Report list for officers
- [ ] Report status workflow
- [ ] Report attachment (images/PDFs)

---

## PHASE 7 — Financial Tracking
> **Goal**: Budget and expenditure tracking per project

- [ ] Budget model
- [ ] Expenditure model
- [ ] Financial API
- [ ] Budget tracker UI
- [ ] Financial reports
- [ ] Fund flow visualization

---

## PHASE 8 — Document Management
> **Goal**: Upload and manage project documents

- [ ] Document model
- [ ] File upload API
- [ ] Document viewer
- [ ] Document search
- [ ] Document verification status

---

## PHASE 9 — Anomaly Detection (Rules)
> **Goal**: Rule-based anomaly detection before AI

- [ ] Anomaly rules engine
- [ ] Duplicate project detection
- [ ] Cost outlier detection
- [ ] Timeline anomaly detection
- [ ] Financial inconsistency detection
- [ ] Anomaly alert system

---

## PHASE 10 — Risk Scoring
> **Goal**: Combine signals into risk scores

- [ ] Risk scoring model
- [ ] Weighted signal calculation
- [ ] Risk score API
- [ ] Risk dashboard
- [ ] Risk level thresholds

---

## PHASE 11 — AI Integration
> **Goal**: ML-based analysis on top of rule-based system

- [ ] AI service architecture
- [ ] Document intelligence (OCR)
- [ ] Text classification for reports
- [ ] Anomaly pattern recognition
- [ ] AI explanation layer

---

## PHASE 12 — Satellite & Geospatial
> **Goal**: Satellite imagery analysis where appropriate

- [ ] Satellite tile integration
- [ ] Before/after comparison UI
- [ ] Land use change detection
- [ ] Construction progress estimation
- [ ] Water body change detection

---

## PHASE 13 — Dashboard & Analytics
> **Goal**: Complete analytics for all user roles

- [ ] Admin dashboard
- [ ] Officer dashboard
- [ ] MP dashboard
- [ ] Analytics API
- [ ] Charts and visualizations
- [ ] Report generation

---

## PHASE 14 — Advanced UI & Polish
> **Goal**: Make it SIH-quality impressive

- [ ] 3D map visualization
- [ ] Particle effects and animations
- [ ] Advanced interactions
- [ ] Responsive polish
- [ ] Performance optimization
- [ ] Accessibility improvements

---

## PHASE 15 — Deployment & Production
> **Goal**: Production-ready deployment

- [ ] Docker Compose setup
- [ ] PostgreSQL migration
- [ ] CI/CD pipeline
- [ ] Environment configuration for production
- [ ] Monitoring and logging
- [ ] Security hardening

---

## Priority Order
Projects → Financial → Documents → Reports → Anomalies → Risk → AI → Maps → Dashboards → Polish

## Rationale
- Build data foundations first (projects, financial)
- Then reporting (citizens, officers)
- Then analysis (anomalies, risk)
- Then advanced features (AI, satellite)
- Then polish and deployment
