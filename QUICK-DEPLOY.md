# VOJAS — FREE Deploy in 15 Minutes

**Stack:** Vercel (frontend) + Cyclic.sh (backend) + Neon PostgreSQL (database)
**Cost:** $0 forever | **Time:** ~15 minutes | **Auto-deploy:** yes

---

## STEP 1 — Create Free PostgreSQL on Neon

1. Go to [neon.tech](https://neon.tech) → Sign up (free, no credit card)
2. Click **New Project**:
   - Name: `vojas-db`
   - Region: Singapore (lowest latency from Vercel)
   - Compute: Free tier (0.5 GB storage)
3. Copy the **Connection string** — looks like:
   ```
   postgresql://username:password@ep-xxx-123456.us-east-2.aws.neon.tech/vojas?sslmode=require
   ```
4. Save this — you'll paste it in Step 3.

---

## STEP 2 — Deploy Backend to Cyclic.sh (Free Always-On)

1. Go to [cyclic.sh](https://cyclic.sh) → Sign up → **Connect GitHub**
2. Authorize access to `ramnivasattanti2008-cloud/VOJAS`
3. Click **New App** → select `VOJAS` repo
4. Cyclic auto-detects `cyclic.json` — click **Connect**
5. In the **Variables** tab, add these (copy-paste exactly):

   | Key | Value |
   |-----|-------|
   | `NODE_ENV` | `production` |
   | `PORT` | `3000` |
   | `DATABASE_URL` | **(paste your Neon connection string from Step 1)** |
   | `JWT_SECRET` | `vojas-prod-secret-32chars-2026!` |
   | `JWT_EXPIRES_IN` | `7d` |
   | `BCRYPT_ROUNDS` | `10` |
   | `CLIENT_BASE_URL` | `https://vojas-frontend.vercel.app` |
   | `SEED_ON_BOOT` | `true` |

6. Click **Deploy** → wait ~2 min
7. Your backend URL will be: `https://vojas-backend.cyclic.app` (or similar — copy it)
8. Verify: `curl https://your-app.cyclic.app/api/v1/health` → should return `{"success":true,...}`

> **Why Cyclic over Render?** Cyclic is always-on (no 15-min sleep). Render free tier spins down and has cold-start delays.

---

## STEP 3 — Deploy Frontend to Vercel (Free Global CDN)

1. Go to [vercel.com](https://vercel.com) → Sign up → **Import GitHub Project**
2. Import `ramnivasattanti2008-cloud/VOJAS`
3. **Configure Project**:
   - Root Directory: `./frontend`
   - Framework Preset: `Vite` (or "Other")
   - Build Command: `npm ci && npm run build`
   - Output Directory: `dist`
4. **Environment Variables** → Add:

   | Key | Value |
   |-----|-------|
   | `VITE_API_BASE_URL` | `https://your-cyclic-app.cyclic.app/api/v1` |
   | `VITE_APP_NAME` | `VOJAS` |
   | `VITE_ENABLE_RQ_DEVTOOLS` | `false` |

   Replace `your-cyclic-app` with your actual Cyclic app URL from Step 2.

5. Click **Deploy** → wait ~1 min
6. Your frontend URL: `https://vojas-frontend.vercel.app` (or custom)
7. Visit it — log in with demo account:

   | Role | Email | Password |
   |------|-------|----------|
   | Admin | `admin@vojas.gov` | `VojasDemo2026` |
   | Officer | `officer@vojas.gov` | `VojasDemo2026` |

---

## STEP 4 — Fix Frontend → Backend Connection

If the frontend shows "Network Error" or blank data:

1. In Vercel dashboard → your project → **Environment Variables**
2. Verify `VITE_API_BASE_URL` matches your Cyclic backend URL exactly (no trailing slash)
3. Redeploy: **Deployments** → **Redeploy** → latest commit

---

## Auto-Deploy Setup (Every Push = New Deploy)

Once you connect Vercel + Cyclic to your GitHub repo:

- **Frontend**: Vercel auto-deploys on every push to `master`/`main`
- **Backend**: Cyclic auto-deploys on every push to `master`/`main`
- Zero manual steps after the first setup!

To verify auto-deploy is active:
- Vercel: Project Settings → **Git** → should show your repo connected
- Cyclic: App → **Settings** → **Git** → should show your repo connected

---

## Alternative: Render Full-Stack (One-Click Blueprint)

If you prefer Render's managed database + backend + frontend in one:

1. Go to [render.com/blueprints](https://dashboard.render.com/blueprints)
2. **Create Blueprint Instance** → connect `ramnivasattanti2008-cloud/VOJAS`
3. Render auto-reads `render.yaml` and provisions all 3 services
4. Set `SEED_ON_BOOT=true` on the backend service
5. Wait ~5 min → backend at `https://vojas-backend.onrender.com`
6. Then deploy frontend to Vercel (same as Step 3, but use Render backend URL)

> Render free tier sleeps after 15 min of no traffic. Use Cyclic if always-on matters.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Backend health check fails | Check Neon `DATABASE_URL` is correct with `?sslmode=require` |
| CORS errors in browser | Ensure `CLIENT_BASE_URL` in Cyclic matches your Vercel URL exactly |
| Frontend shows "Login failed" | Verify `VITE_API_BASE_URL` in Vercel env vars has no trailing slash |
| Build fails on Vercel | Check Node version: use Node 20 (` engines` in package.json) |
| Cyclic deploy stuck | Check build logs in Cyclic dashboard — usually missing env vars |
| Prisma migration error | In Cyclic shell: `npx prisma migrate deploy --accept-data-loss` |

---

## Database Schema (Prisma)

The backend auto-runs `prisma db push` on boot. If using Neon, the schema syncs automatically on first deploy.

To manually run migrations:
```bash
# In Cyclic shell, or locally:
DATABASE_URL="postgresql://..." npx prisma migrate deploy
```

---

## Production Checklist

- [ ] Neon PostgreSQL connected (Step 1)
- [ ] Cyclic backend deployed and healthy (Step 2)
- [ ] Vercel frontend deployed (Step 3)
- [ ] `VITE_API_BASE_URL` updated in Vercel (Step 4)
- [ ] Login works with demo accounts
- [ ] Auto-deploy connected (Vercel + Cyclic GitHub integration)
- [ ] `JWT_SECRET` changed to a strong secret (not the placeholder)
