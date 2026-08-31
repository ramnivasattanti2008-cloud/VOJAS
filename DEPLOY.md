# VOJAS Deployment Guide

This guide covers three deployment paths: Render (full stack), Vercel (frontend only with a Render backend), and manual Docker for self-hosting.

---

## 1. Deploy to Render (Backend + Database)

Render hosts the Node.js backend, a managed PostgreSQL database, and serves the static frontend via its CDN.

### Prerequisites

- [Render account](https://render.com) (free tier is sufficient to start)
- [GitHub repository](https://github.com) containing this codebase

### Step-by-step

#### 1. Push to GitHub

Make sure your repo is clean and pushed:

```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

#### 2. Connect Render Blueprint

1. Log in to [Render Dashboard](https://dashboard.render.com)
2. Click **"New +"** → **"Blueprint"**
3. Authorize Render to access your GitHub repo (if not already authorized)
4. Select your `vojas` repository
5. Render will detect `render.yaml` automatically — review the listed services:
   - `vojas-db` — PostgreSQL database
   - `vojas-backend` — Node.js API
   - `vojas-frontend` — Static site

#### 3. Configure Environment Variables

Render auto-populates most values from `render.yaml`, but you must set:

| Variable | Notes |
|---|---|
| `JWT_SECRET` | Render auto-generates a secure value. You can replace it with your own 32+ char secret. |
| `SEED_ON_BOOT` | Set to `true` to seed demo data on first deploy |

All other variables are inherited from `render.yaml`.

#### 4. Deploy

Click **"Apply"** — Render will provision the services in order:

1. **PostgreSQL** provisions first (~2 min)
2. **Backend** builds and starts (~3 min)
3. **Frontend** builds and publishes (~2 min)

The backend will be available at `https://vojas-backend.onrender.com` and the frontend at `https://vojas-frontend.onrender.com`.

#### 5. Verify the Backend

```bash
curl https://vojas-backend.onrender.com/api/v1/health
```

Expected response: `{"status":"ok","timestamp":"..."}`

#### 6. Seed Demo Data

If you set `SEED_ON_BOOT=true` in Step 3, demo users are created automatically on first boot:

| Role | Email | Password |
|---|---|---|
| Admin | admin@vojas.gov | VojasDemo2026 |
| Officer | officer@vojas.gov | VojasDemo2026 |
| Reviewer | reviewer@vojas.gov | VojasDemo2026 |
| Analyst | analyst@vojas.gov | VojasDemo2026 |

If `SEED_ON_BOOT=false`, seed manually:

```bash
docker compose exec backend npx tsx scripts/seed.ts
```

#### 7. Update Frontend API URL (if needed)

If your Render backend URL differs from the placeholder in `render.yaml`, update the `VITE_API_BASE_URL` environment variable in the Render frontend service:

```
VITE_API_BASE_URL=https://vojas-backend.onrender.com/api/v1
```

---

## 2. Deploy to Vercel (Frontend) with Render Backend

Deploy the frontend to Vercel while the backend runs on Render.

### Prerequisites

- [Vercel account](https://vercel.com) connected to GitHub
- A Render backend already deployed (from Section 1 above)

### Step-by-step

#### 1. Import to Vercel

1. Log in to [Vercel](https://vercel.com)
2. Click **"Add New..."** → **"Project"**
3. Import your GitHub repository
4. In **"Configure Project"**:
   - **Framework Preset**: Vite (or "Other")
   - **Root Directory**: `./frontend`
   - **Build Command**: `npm ci && npm run build`
   - **Output Directory**: `dist`

#### 2. Set Environment Variable

Before deploying, add an environment variable:

| Variable | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://vojas-backend.onrender.com/api/v1` |

Replace the domain with your actual Render backend URL from Section 1.

#### 3. Deploy

Click **"Deploy"**. Vercel will build the frontend and publish it to `https://your-project.vercel.app`.

#### 4. Custom Domain (Optional)

1. Go to **Project Settings** → **Domains**
2. Add your custom domain (e.g. `vojas.yourgov.org`)
3. Update `CLIENT_BASE_URL` in Render to point to your Vercel domain:
   ```
   CLIENT_BASE_URL=https://vojas.yourgov.org
   ```

---

## 3. Manual Docker Deploy (Self-Hosting)

Run the full stack locally with Docker Compose.

### Prerequisites

- [Docker](https://docker.com) (Desktop on Windows/Mac, or Docker Engine on Linux)
- Docker Compose (included in Docker Desktop)

### Step-by-step

```bash
# Clone the repo
git clone https://github.com/your-org/vojas.git
cd vojas

# Start all services (PostgreSQL + backend + frontend)
docker compose up --build

# The app will be available at:
#   Frontend:  http://localhost
#   Backend:   http://localhost:5000
```

To run in detached mode:

```bash
docker compose up --build -d
docker compose logs -f backend
```

To stop:

```bash
docker compose down        # stop containers
docker compose down -v     # stop AND remove volumes (RESETS DATABASE)
```

### Switching to SQLite (no Docker PostgreSQL)

If you want SQLite instead of PostgreSQL for local dev via Docker:

1. Set `DATABASE_URL=file:./dev.db` in `backend/.env`
2. Update `backend/prisma/schema.prisma`: change `provider = "sqlite"` (already set)
3. Remove the `db` service from `docker-compose.yml`
4. Remove the `DATABASE_URL` override from `docker-compose.yml`'s backend service
5. Run `docker compose up --build`

---

## 4. Post-Deploy Checklist

Run through these checks after any deployment:

- [ ] **Health endpoint**: `GET https://your-backend.com/api/v1/health`
  - Expected: `{"status":"ok","timestamp":"..."}`
- [ ] **Login works**: Visit the frontend, log in with a demo account
  - Email: `admin@vojas.gov` / Password: `VojasDemo2026`
- [ ] **Seed data present**: If `SEED_ON_BOOT=false`, run the seed script:
  ```bash
  docker compose exec backend npx tsx scripts/seed.ts
  ```
- [ ] **Frontend → Backend connectivity**: Check browser DevTools → Network tab for `/api/v1/*` requests — no 4xx/5xx errors
- [ ] **CORS configured**: If using a custom domain, ensure `CLIENT_BASE_URL` in the backend env matches the frontend URL exactly (no trailing slash)
- [ ] **JWT_SECRET set**: The backend refuses to start in production with a short or default secret

---

## Environment Variables Reference

### Backend (`backend/.env`)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | Yes | `development` | Set to `production` on Render |
| `PORT` | Yes | `5000` | Render uses `10000` |
| `DATABASE_URL` | Yes | `file:./dev.db` | PostgreSQL in production |
| `JWT_SECRET` | Yes | — | Must be 32+ characters in production |
| `JWT_EXPIRES_IN` | No | `7d` | — |
| `BCRYPT_ROUNDS` | No | `10` | — |
| `CLIENT_BASE_URL` | Yes | `http://localhost:5173` | Frontend URL for CORS |
| `UPLOAD_DIR` | No | `./uploads` | — |
| `MAX_UPLOAD_SIZE_MB` | No | `10` | — |
| `SEED_ON_BOOT` | No | `false` | Set `true` to seed demo data on start |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Yes | `http://localhost:5000/api/v1` | Backend base URL |
| `VITE_APP_NAME` | No | `VOJAS` | — |
| `VITE_ENABLE_RQ_DEVTOOLS` | No | `true` | Set `false` in production |
