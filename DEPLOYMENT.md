# VOJAS — Complete Deployment Guide

Deploy **VOJAS** for free to production with Vercel (frontend), Cyclic (backend), and Neon (database).

**Cost:** $0/month forever | **Time:** ~30 minutes | **Monitoring:** Built-in

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Prerequisites](#prerequisites)
3. [Step-by-Step Deployment](#step-by-step-deployment)
4. [Environment Variables](#environment-variables)
5. [Troubleshooting](#troubleshooting)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Alternative Platforms](#alternative-platforms)

---

## Architecture Overview

```
┌─────────────────────┐
│  Vercel (Frontend)  │
│  React 19 + Vite    │
│  Global CDN         │
└──────────┬──────────┘
           │ (HTTPS)
           ↓
┌─────────────────────┐
│ Cyclic (Backend)    │
│ Node.js + Express   │
│ Always-On Server    │
└──────────┬──────────┘
           │ (HTTPS)
           ↓
┌─────────────────────┐
│   Neon PostgreSQL   │
│  Managed Database   │
│  Free Tier: 0.5 GB  │
└─────────────────────┘
```

**Why this stack?**
- **Vercel:** Fastest React deployment, global CDN, free forever
- **Cyclic:** Always-on backend (no cold starts), free, easy GitHub integration
- **Neon:** Serverless PostgreSQL, unlimited databases, backups included

---

## Prerequisites

You need:
- GitHub account (to connect repos)
- Vercel account (free tier)
- Cyclic account (free tier, GitHub-connected)
- Neon account (free tier, no credit card)
- Your VOJAS GitHub repository (public or private)

---

## Step-by-Step Deployment

### STEP 1 — Set Up PostgreSQL Database (Neon)

1. **Go to [neon.tech](https://neon.tech)**
2. Click **Sign Up** → Sign in with GitHub (recommended)
3. **Create a new project:**
   - Name: `vojas-prod`
   - Region: **Singapore** (for APAC latency)
   - Compute: **Free** (0.5 GB included)
4. Click **Create Project**
5. You'll see a connection string. Copy the full URL:
   ```
   postgresql://username:password@ep-xxx-region.neon.tech/vojas?sslmode=require
   ```
   Save this in a secure location — you'll need it in Step 3.

6. **Create branches (optional):** Neon lets you create separate DB branches for staging
   - Main branch: `main` (production)
   - Dev branch: `dev` (for testing)
   
   For now, use `main` branch only.

**Verify:** Go to Neon Dashboard → Your Project → Copy the connection string and test:
```bash
# Test from your machine (requires psql installed)
psql "postgresql://username:password@ep-xxx-region.neon.tech/vojas?sslmode=require" -c "SELECT 1;"
# Should return: (1 row) 1
```

---

### STEP 2 — Deploy Backend to Cyclic

Cyclic is the **best free Node.js host** because it's always-on (Render sleeps after 15 min).

1. **Go to [cyclic.sh](https://cyclic.sh)**
2. Click **Sign Up** → Sign in with **GitHub**
3. Authorize Cyclic to access your GitHub account
4. Click **Deploy** → Select your `VOJAS` repository
5. Click **Next** → Cyclic auto-detects `cyclic.json` and `backend/Dockerfile`
6. **Configure Variables** in the Variables section:

   | Key | Value | Notes |
   |-----|-------|-------|
   | `NODE_ENV` | `production` | Production mode |
   | `PORT` | `3000` | Cyclic default port |
   | `DATABASE_URL` | `postgresql://...` | **Paste Neon connection string** |
   | `JWT_SECRET` | `<strong-random-secret>` | **Generate:** `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` |
   | `JWT_EXPIRES_IN` | `7d` | Token expiry |
   | `BCRYPT_ROUNDS` | `10` | Password hashing rounds |
   | `CLIENT_BASE_URL` | `https://vojas-frontend.vercel.app` | **Update after Vercel deploy** |
   | `SEED_ON_BOOT` | `true` | Load demo data on first boot |

7. Click **Deploy** → Wait 2-5 minutes
8. **Get your backend URL** from the Cyclic dashboard (looks like `https://app-name-xxxx.cyclic.app`)
9. **Verify deployment:**
   ```bash
   curl https://your-cyclic-app.cyclic.app/api/v1/health
   # Should return: {"success":true,"uptime":...}
   ```

**Troubleshooting Cyclic:**
- Build fails? Check the build logs in Cyclic dashboard
- Deployment stuck? Ensure all env vars are set
- Database connection error? Verify `DATABASE_URL` has `?sslmode=require`

---

### STEP 3 — Deploy Frontend to Vercel

1. **Go to [vercel.com](https://vercel.com)**
2. Click **Sign Up** → Sign in with **GitHub**
3. Click **Add New** → **Project**
4. **Import Git Repository** → Select `VOJAS`
5. **Configure Project:**
   - **Root Directory:** `./frontend`
   - **Framework Preset:** `Vite`
   - **Build Command:** `npm ci && npm run build`
   - **Install Command:** `npm ci`
   - **Output Directory:** `dist`

6. **Environment Variables:**
   - Click **Environment Variables**
   - Add these:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://your-cyclic-app.cyclic.app/api/v1` |
   | `VITE_APP_NAME` | `VOJAS` |
   | `VITE_ENABLE_RQ_DEVTOOLS` | `false` |

7. Click **Deploy** → Wait ~2 minutes
8. **Get your frontend URL** (looks like `https://vojas-frontend.vercel.app`)

---

### STEP 4 — Update Backend with Frontend URL

Now that Vercel has deployed, update the backend to allow requests from Vercel:

1. **Go back to Cyclic Dashboard** → Your app
2. Click **Variables** → Edit
3. Update `CLIENT_BASE_URL` to your **Vercel URL**:
   ```
   https://your-vojas-frontend.vercel.app
   ```
4. Click **Save** → Cyclic auto-redeploys

---

### STEP 5 — Test the Live Application

1. **Visit your frontend:** `https://your-vojas-frontend.vercel.app`
2. **Log in with demo account:**

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@vojas.gov` | `VojasDemo2026` |
   | Officer | `officer@vojas.gov` | `VojasDemo2026` |
   | Citizen | `citizen@vojas.gov` | `VojasDemo2026` |

3. **Check the backend health:**
   ```
   https://your-cyclic-app.cyclic.app/api/v1/health
   ```
   Should return: `{"success":true,"uptime":...}`

4. **Test a feature:** Navigate to the dashboard, view projects, check maps

**If you see CORS errors:**
- Clear browser cache (Ctrl+Shift+Delete)
- Check `CLIENT_BASE_URL` in Cyclic is exactly your Vercel URL
- Wait 60 seconds for Cyclic to redeploy

---

## Environment Variables

### Frontend (Vercel Environment)

| Variable | Purpose | Example |
|----------|---------|---------|
| `VITE_API_BASE_URL` | Backend API endpoint | `https://app.cyclic.app/api/v1` |
| `VITE_APP_NAME` | Application name | `VOJAS` |
| `VITE_ENABLE_RQ_DEVTOOLS` | React Query debugger | `false` |

These are embedded at **build time** (not runtime), so changing them requires a rebuild.

### Backend (Cyclic Environment)

| Variable | Purpose | Default | Required |
|----------|---------|---------|----------|
| `NODE_ENV` | Environment mode | `development` | ✅ |
| `PORT` | Server port | `5000` | ✅ |
| `DATABASE_URL` | PostgreSQL connection | N/A | ✅ |
| `JWT_SECRET` | Token signing key | N/A | ✅ |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` | ✅ |
| `BCRYPT_ROUNDS` | Password hash rounds | `10` | ✅ |
| `CLIENT_BASE_URL` | Frontend URL for CORS | `http://localhost:5173` | ✅ |
| `SEED_ON_BOOT` | Auto-seed empty DB | `false` | ❌ |

### Database (Neon)

Managed by Neon. Backups and replication are automatic on free tier.

---

## Troubleshooting

### Frontend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| "Network Error" or blank data | Wrong API URL | Check `VITE_API_BASE_URL` in Vercel, redeploy |
| CORS errors in console | Backend URL mismatch | Verify `CLIENT_BASE_URL` on Cyclic matches Vercel URL |
| Old content still showing | Cache issues | Hard refresh (Ctrl+F5) or clear cache |
| Build fails on Vercel | Node version mismatch | Ensure Node 20+ in `frontend/package.json` `engines` |

### Backend Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Health check fails | DB not connected | Verify `DATABASE_URL` with `?sslmode=require` |
| "Cannot reach Neon" | Network issue | Check Neon connection string, test with psql |
| Prisma migration errors | Schema mismatch | Run `npx prisma migrate deploy --accept-data-loss` |
| Cyclic build stuck | Missing dependencies | Check `backend/package.json`, ensure `npm ci` works locally |

### Database Issues

| Problem | Cause | Solution |
|---------|-------|----------|
| Connection refused | Wrong host/port | Copy full connection string from Neon dashboard |
| Auth failed | Wrong password | Regenerate Neon connection string |
| Storage exceeded | Too much data | Check table sizes in Neon console, delete old logs/files |

### Deployment Issues

| Problem | Solution |
|---------|----------|
| Cyclic deploy stuck for >10 min | Check build logs in Cyclic dashboard, restart deploy |
| Vercel deploy cancelled | Check `Output Directory` is `dist`, not `build` |
| Auto-deploy not working | Verify GitHub integration active in Vercel/Cyclic settings |

---

## Monitoring & Maintenance

### Daily Checks

- **Backend Health:** `https://your-app.cyclic.app/api/v1/health`
- **Uptime:** Cyclic dashboard shows real-time status
- **Errors:** Check Cyclic logs tab for any failures

### Weekly Maintenance

1. **Check logs:**
   - Cyclic dashboard → Logs tab
   - Look for 5xx errors, high memory usage

2. **Verify database:**
   - Neon dashboard → Monitoring tab
   - Check storage usage, connection count

3. **Review performance:**
   - Vercel Analytics (Speed Insights)
   - Cyclic monitoring

### Monthly Reviews

1. **Backup database:** Neon has automatic backups (7-day retention on free tier)
2. **Review costs:** All three services should show $0/month
3. **Update dependencies:**
   ```bash
   cd frontend && npm outdated && npm update
   cd ../backend && npm outdated && npm update
   ```

---

## Auto-Deployment

Once set up, **every push to GitHub triggers automatic deployment:**

1. **Push code to GitHub:**
   ```bash
   git add .
   git commit -m "feat: New feature"
   git push origin main
   ```

2. **Vercel automatically:**
   - Pulls changes
   - Installs dependencies
   - Runs build
   - Deploys to CDN
   - Invalidates cache

3. **Cyclic automatically:**
   - Pulls changes
   - Installs dependencies
   - Builds Docker image
   - Restarts server
   - Updates live URL

**No manual steps needed after initial setup!**

---

## Alternative Platforms

### Option 2: Render (One-Click Blueprint)

Render uses `render.yaml` for infrastructure-as-code:

1. Go to [render.com/blueprints](https://dashboard.render.com/blueprints)
2. Click **Create Blueprint Instance**
3. Select `VOJAS` repository
4. Render auto-provisions PostgreSQL + Backend + Frontend
5. Wait ~10 minutes

**Pros:** Single dashboard, managed services  
**Cons:** Free tier backend sleeps after 15 min (cold starts)

### Option 3: Railway

Railway is similar to Render with free tier:

1. Go to [railway.app](https://railway.app)
2. Connect GitHub
3. Select `VOJAS` repo
4. Add services: PostgreSQL, Node.js backend, Static frontend
5. Set environment variables same as Cyclic

**Pros:** Good documentation  
**Cons:** Free tier expires after 5 hours/month

### Option 4: Self-Hosted (DigitalOcean, Linode)

For $5-10/month, you get a full Linux VM:

1. Create Droplet/Linode instance (Ubuntu 22.04 recommended)
2. Install Node.js 20, PostgreSQL, Docker
3. Deploy backend with Docker, frontend as static site
4. Use Let's Encrypt for SSL

**Pros:** Full control, good performance  
**Cons:** Manual setup, maintenance required

---

## Scaling (Beyond Free Tier)

As your app grows, upgrade:

| Component | Free Tier | Paid Tier | Trigger |
|-----------|-----------|-----------|---------|
| **Vercel** | 100 GB/month bandwidth | $20/month | >100 GB data transfer |
| **Cyclic** | Always-on, unlimited | Pro $25/month | Need faster builds |
| **Neon** | 0.5 GB storage | $14/month + usage | >0.5 GB database |

For most projects, free tier is sufficient indefinitely.

---

## Production Checklist

Before going live, ensure:

- [ ] Database: Neon PostgreSQL connected and populated
- [ ] Backend: Cyclic health check `/api/v1/health` returns 200
- [ ] Frontend: Vercel deployed and accessible
- [ ] Auth: Login works with demo accounts
- [ ] API: All endpoints functional (`/api/v1/projects`, `/api/v1/analytics`, etc.)
- [ ] CORS: No "Access-Control-Allow-Origin" errors
- [ ] JWT_SECRET: Changed from default to strong random value
- [ ] CLIENT_BASE_URL: Points to Vercel frontend
- [ ] Auto-deploy: GitHub → Vercel/Cyclic integration active
- [ ] SSL: All URLs use `https://` (automatic on Vercel/Cyclic)
- [ ] Monitoring: Subscribed to Cyclic alerts
- [ ] Documentation: README.md and docs updated with live URLs

---

## Getting Help

- **Vercel Issues:** [vercel.com/support](https://vercel.com/support)
- **Cyclic Issues:** [cyclic.sh/docs](https://docs.cyclic.sh)
- **Neon Issues:** [neon.tech/docs](https://neon.tech/docs)
- **VOJAS Issues:** Open a GitHub issue in the repository

---

## Next Steps

1. Follow [QUICK-DEPLOY.md](./QUICK-DEPLOY.md) for fast 15-minute setup
2. Read [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) for technical details
3. Join the project discussions for support
4. Contribute! See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

**Happy Deploying! 🚀**
