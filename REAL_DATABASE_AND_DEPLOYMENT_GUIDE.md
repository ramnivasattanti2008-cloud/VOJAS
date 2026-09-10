# VOJAS: Real Database Setup, Real Authentication, and "Deploy First" Guide

---

## 1. Can We Deploy First and Then Develop? (YES — Recommended!)

**Yes, 100% absolutely.** In modern software development, **deploying first** (Continuous Deployment / CD) is considered the **industry gold standard**.

### Why Deploying First is Better:
1. **Always Live**: Evaluators, professors, clients, and teammates can access a real `.vercel.app` or `.onrender.com` URL 24/7 without you having to keep your personal laptop on.
2. **Instant Sync**: Every time you commit and push (`git push origin master`), the cloud platform automatically builds and updates the live site in under 90 seconds.
3. **No "Works on My Machine" Panic**: Environment discrepancies (like Linux vs. Windows path separators or Node version mismatches) are caught immediately rather than hours before a presentation.
4. **Test on Real Devices**: You can open the live app on your phone, test contractor photo uploads, and check the mobile UI responsiveness directly.

---

## 2. Setting Up a Real Cloud Database

Currently, VOJAS runs locally against PostgreSQL + PostGIS (`vojas-db-dev` container). To make it a **globally accessible real cloud database**, you can use any free hosted PostgreSQL provider in 2 minutes:

### Recommended Free Cloud Providers:
- **[Neon.tech](https://neon.tech)** (Fastest serverless Postgres, free tier, instant setup)
- **[Supabase.com](https://supabase.com)** (Free hosted Postgres + PostGIS)
- **[Render.com PostgreSQL](https://render.com)** (Free managed Postgres)

### Step-by-Step Setup:

1. **Create a Database**:
   - Go to [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com).
   - Click **Create Project** $\to$ name it `vojas`.
   - Copy your `DATABASE_URL` (it looks like `postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require`).

2. **Update Your `.env`**:
   Replace the `DATABASE_URL` line in both `apps/api/.env` and `.env`:
   ```env
   DATABASE_URL="postgresql://username:password@ep-xyz.us-east-2.aws.neon.tech/neondb?sslmode=require"
   ```

3. **Push the Schema & Seed the 13 Curated Projects**:
   Run these two commands from your terminal:
   ```bash
   pnpm --filter @vojas/db exec prisma db push
   pnpm --dir "packages/db" exec tsx prisma/seedShowcase.ts
   ```
   **That's it!** Your real cloud database now contains all tables, indexes, real MPs (Smt Aparajita Sarangi, etc.), contractors, and the 13 curated projects (5 Finished, 5 Ongoing, 3 Ghost/Fraud works).

---

## 3. Real Authentication System (Already Implemented & Active)

VOJAS includes a **production-grade authentication & authorization engine**:

### What Is Already Built & Active:
- 🔒 **Real Password Hashing**: Uses `bcrypt` with cost factor 10 (passwords are never stored in plaintext).
- 🛡️ **Strict Password Policy**: Enforces minimum 10 characters with uppercase, lowercase, and numeric digits.
- 🔑 **Dual Token Architecture**:
  - Short-lived **JWT Access Tokens** for stateless, tamper-proof API requests.
  - Long-lived **Refresh Tokens** stored as secure SHA-256 hashes in the PostgreSQL `Session` table.
- 🍪 **httpOnly Secure Cookies**: Prevents Cross-Site Scripting (XSS) attacks by securing session tokens in browser cookies (`vojas_token`).
- 📝 **Immutable Audit Trail**: Every registration, login attempt, failure, and role change is logged to the `AuditLog` table with IP address and timestamp.
- 👥 **Role-Based Access Control (RBAC)**: Enforces role permissions across `CITIZEN`, `MP`, `OFFICER`, and `CONTRACTOR`.

### Live Authentication Endpoints:
- `POST /api/v1/auth/register` — Create new accounts with real validation.
- `POST /api/v1/auth/login` — Real credential verification and session generation.
- `POST /api/v1/auth/refresh` — Refresh expired access tokens securely.
- `GET /api/v1/auth/me` — Inspect current session user and privileges.

### Demo / Testing Convenience:
For grading, demos, or fast access, the `/login` page includes **1-Click Role Login** buttons pre-linked to real hashed database records:
- `citizen@vojas.gov`
- `mp@vojas.gov`
- `officer@vojas.gov`
- `contractor@vojas.gov`
(Default password: `Admin123!`)

---

## 4. How to Deploy Live in 5 Minutes

### Step A: Deploy Frontend to Vercel (1-Click)
1. Go to [vercel.com](https://vercel.com) and sign in with GitHub.
2. Click **Add New Project** $\to$ Import `ramnivasattanti2008-cloud/VOJAS`.
3. In Project Settings:
   - **Root Directory**: `apps/web`
   - **Framework Preset**: Next.js
   - **Environment Variables**:
     - `NEXT_PUBLIC_API_URL`: Your backend URL (or `https://your-api.onrender.com`)
4. Click **Deploy**. Vercel will build your Next.js app and give you a public URL like `https://vojas.vercel.app`.

### Step B: Deploy Backend to Render / Railway
1. Go to [render.com](https://render.com) or [railway.app](https://railway.app).
2. Connect your GitHub repository `ramnivasattanti2008-cloud/VOJAS`.
3. Select **Web Service** with Docker or Node:
   - **Root Directory**: `.`
   - **Build Command**: `pnpm install && pnpm --filter @vojas/db exec prisma generate && pnpm --filter @vojas/shared build && pnpm --filter @vojas/domain build && pnpm --filter @vojas/api build`
   - **Start Command**: `pnpm --filter @vojas/api start`
   - **Environment Variables**:
     - `DATABASE_URL`: Your cloud database connection string
     - `JWT_SECRET`: Any random 32-character string
     - `CLIENT_BASE_URL`: Your Vercel frontend URL
4. Click **Deploy**.

---

## Summary of Completed Deliverables

| Requirement | Implementation Status | Verification |
|---|---|---|
| **Deploy First Workflow** | ✅ Enabled via `apps/web/vercel.json`, `apps/api/Dockerfile`, `apps/web/Dockerfile` | Pushed to GitHub |
| **Real Cloud Database** | ✅ Prisma schema ready for any cloud Postgres (Neon/Supabase/Render) | Tested with PostGIS |
| **Real Authentication** | ✅ Bcrypt hashing + JWT + Refresh Sessions + RBAC + Audit Logging | Tested live (Status 200 & 201) |
| **Curated 13 Works** | ✅ 5 Finished, 5 Ongoing, 3 Ghost/Fraud works with weekly satellite imagery | Live in DB |
| **Contractor Filing Engine** | ✅ Contractor submits `% done`, `% left`, funds spent $\to$ AI checks Sentinel-2 | Verified |
