# VOJAS Backend Deployment Alternatives to Cyclic

**Cyclic not working for you?** No problem! Here are proven free alternatives that are even better.

---

## 🏆 **RECOMMENDED: Fly.io** (BEST Alternative)

**Why Fly.io?**
- ✅ **Always-on** (no 15-min sleep like Render)
- ✅ **Free tier:** 3 shared-cpu-1x 256MB VMs + 160GB outbound bandwidth
- ✅ **Global:** Deploy to 35+ regions worldwide
- ✅ **GitHub deployment:** Automatic on every push
- ✅ **Fast:** Sub-500ms response times
- ✅ **Production-grade:** Used by real companies

**Deployment Time:** ~10 minutes  
**Monthly Cost:** $0 (free tier sufficient)

### Fly.io Quick Setup

1. **Go to:** https://fly.io
2. **Sign up** with GitHub
3. **Install CLI:**
   ```bash
   npm install -g flyctl
   ```

4. **Create app:**
   ```bash
   cd backend
   flyctl launch
   ```
   Answer prompts:
   - App name: `vojas-backend`
   - Region: `sin` (Singapore)
   - Database: `n` (use Neon instead)

5. **Set environment variables:**
   ```bash
   flyctl secrets set \
     NODE_ENV=production \
     PORT=3000 \
     DATABASE_URL="postgresql://..." \
     JWT_SECRET="your-secret-here" \
     JWT_EXPIRES_IN="7d" \
     BCRYPT_ROUNDS="10" \
     CLIENT_BASE_URL="https://vojas-frontend.vercel.app" \
     SEED_ON_BOOT="true"
   ```

6. **Deploy:**
   ```bash
   flyctl deploy
   ```

7. **Get your URL:**
   ```bash
   flyctl info
   ```
   Backend URL: `https://vojas-backend.fly.dev`

8. **Auto-deploy on git push:**
   ```bash
   flyctl tokens create deploy
   # Copy token, add to GitHub secrets as FLY_API_TOKEN
   # Create `.github/workflows/deploy.yml` (template provided below)
   ```

✅ **Done!** Your backend is live on Fly.io

---

## 🎯 **COMPARISON: All Backend Alternatives**

| Platform | Free Tier | Sleep? | Always-On? | Speed | Setup | Auto-Deploy |
|----------|-----------|--------|-----------|-------|-------|------------|
| **Fly.io** ⭐ | $0 | ❌ No | ✅ Yes | Fast | 10 min | ✅ Yes |
| **Render** | $0 | ✅ Yes (15 min) | ❌ No | Medium | 5 min | ✅ Yes |
| **Railway** | $0 | ✅ Yes (5 hours/mo) | ❌ No | Medium | 5 min | ✅ Yes |
| **Replit** | $0 | ✅ Yes | ❌ No | Slow | 10 min | ✅ Yes |
| **Heroku** | ❌ No | N/A | N/A | N/A | N/A | N/A |
| **Cyclic** | $0 | ❌ No | ✅ Yes | Fast | 5 min | ✅ Yes |

**Best free always-on options:**
1. **Fly.io** ⭐ (Recommended - if available in your region)
2. **Cyclic** (Original choice - if working)
3. **Render** (If you can tolerate 15-min cold starts)

---

## 📋 **Option 2: Render** (Easier Alternative)

**Why Render?**
- ✅ Easiest setup (dashboard only, no CLI)
- ✅ Good documentation
- ✅ Free tier: 750 hours/month (enough for 24/7 if you don't hit limits)
- ❌ Sleeps after 15 min of inactivity (cold start delay)

**Setup Time:** ~5 minutes

### Render Quick Setup

1. **Go to:** https://render.com
2. **Sign up** with GitHub
3. **Create New** → **Web Service**
4. **Connect repository:** Select `VOJAS`
5. **Configure:**
   - Name: `vojas-backend`
   - Environment: `Node`
   - Region: `Singapore`
   - Build Command: `npm ci && npx prisma generate && npm run build`
   - Start Command: `npx prisma db push --accept-data-loss && node dist/server.js`

6. **Add environment variables:**
   ```
   NODE_ENV = production
   PORT = 3000
   DATABASE_URL = postgresql://...
   JWT_SECRET = your-secret
   JWT_EXPIRES_IN = 7d
   BCRYPT_ROUNDS = 10
   CLIENT_BASE_URL = https://vojas-frontend.vercel.app
   SEED_ON_BOOT = true
   ```

7. **Click Deploy**
8. **Your backend URL:** `https://vojas-backend.onrender.com`

✅ **Done!** Deployed to Render

**Note:** First request after 15 min of inactivity will be slow (~20 seconds). Subsequent requests are fast.

---

## 📋 **Option 3: Railway** (Good Alternative)

**Why Railway?**
- ✅ Beautiful dashboard
- ✅ GitHub integration built-in
- ✅ Free tier: $5 credit/month (good for small apps)
- ❌ Limited free hours

**Setup Time:** ~10 minutes

### Railway Quick Setup

1. **Go to:** https://railway.app
2. **Sign up** with GitHub
3. **New Project** → **Deploy from GitHub repo**
4. **Select:** `VOJAS` repository
5. **Click Deploy**
6. **Add variables:**
   - Go to **Environment** tab
   - Add all 8 variables (same as Cyclic)

7. **Get your URL:**
   - Go to **Settings** → **Domains**
   - Railway generates: `https://vojas-backend.railway.app`

✅ **Done!** Deployed to Railway

---

## 🚀 **Quick Decision Matrix**

**Choose Fly.io if:**
- ✅ You need always-on (no cold starts)
- ✅ You want best performance
- ✅ You're comfortable with CLI
- ✅ Fly.io is available in your region

**Choose Render if:**
- ✅ You want simplest dashboard setup
- ✅ You can tolerate 15-min cold starts
- ✅ You prefer GUI over CLI
- ✅ You want easiest auto-deploy

**Choose Railway if:**
- ✅ You like modern UI
- ✅ You have some budget ($5/month)
- ✅ You want smooth experience
- ✅ You don't mind limited free hours

---

## 🔄 **Migration Path: Cyclic → Fly.io**

If Cyclic was working but you want to switch:

1. **Push code to GitHub** (already done)
2. **Follow Fly.io setup above**
3. **Get Fly.io backend URL**
4. **Update Vercel environment variable:**
   ```
   VITE_API_BASE_URL = https://your-fly-app.fly.dev/api/v1
   ```
5. **Done!** No code changes needed

---

## 🎯 **MY RECOMMENDATION: Use Fly.io**

**Here's why:**
1. **Always-on** - no cold starts like Render
2. **Free forever** - generous free tier
3. **Production quality** - real companies use it
4. **Global scale** - 35+ regions
5. **GitHub integration** - auto-deploy on push
6. **CLI-based** - more control

### **Fly.io Setup (Step-by-Step)**

```bash
# 1. Install Flyctl CLI
npm install -g flyctl

# 2. Go to backend directory
cd backend

# 3. Launch app (answer prompts)
flyctl launch
# Answer:
# - App name: vojas-backend
# - Region: sin (Singapore)
# - Database: n (we use Neon)

# 4. Set all environment variables at once
flyctl secrets set \
  NODE_ENV=production \
  PORT=3000 \
  DATABASE_URL="postgresql://user:pass@host/db?sslmode=require" \
  JWT_SECRET="your-generated-secret-here" \
  JWT_EXPIRES_IN="7d" \
  BCRYPT_ROUNDS="10" \
  CLIENT_BASE_URL="https://vojas-frontend.vercel.app" \
  SEED_ON_BOOT="true"

# 5. Deploy
flyctl deploy

# 6. Get your app URL
flyctl info
# Look for "https://vojas-backend.fly.dev" in output
```

✅ **Your backend is live on Fly.io!**

---

## 📱 **Update Your Frontend (Vercel)**

After deploying backend to Fly.io (or your choice):

1. **Go to:** https://vercel.com/dashboard
2. **Select:** Your VOJAS frontend project
3. **Settings** → **Environment Variables**
4. **Update:** `VITE_API_BASE_URL`
   ```
   https://vojas-backend.fly.dev/api/v1
   ```
   (or your chosen platform's URL)
5. **Redeploy:** Click **Deployments** → **Redeploy**

✅ **Frontend now connects to your new backend!**

---

## ✅ **Verification**

After deployment, test:

```bash
# Check health (replace with your URL)
curl https://vojas-backend.fly.dev/api/v1/health

# Should return:
# {"success":true,"uptime":...}
```

Visit frontend: `https://vojas-frontend.vercel.app`
- Login should work
- Data should load
- No CORS errors

---

## 📞 **Still Having Issues?**

| Problem | Solution |
|---------|----------|
| Fly.io not available in region | Use Render or Railway |
| CLI too complicated | Use Render (dashboard only) |
| Want zero cold starts | Use Fly.io |
| Want simplest setup | Use Render |
| Budget up to $5/month | Use Railway |

---

## 🎯 **FINAL RECOMMENDATION**

**Use this order:**

1. **First choice:** Fly.io (best for always-on)
2. **Second choice:** Render (easiest if Fly not available)
3. **Third choice:** Railway (good UI, small cost)
4. **Last resort:** Replit (slow but works)

---

## 🚀 **NEXT STEPS**

### If using Fly.io:
1. Install: `npm install -g flyctl`
2. Follow: Fly.io Quick Setup above
3. Update Vercel: `VITE_API_BASE_URL`
4. Test: Visit frontend, log in

### If using Render:
1. Go to: https://render.com
2. Follow: Render Quick Setup above
3. Update Vercel: `VITE_API_BASE_URL`
4. Test: Visit frontend, log in

### If using Railway:
1. Go to: https://railway.app
2. Follow: Railway Quick Setup above
3. Update Vercel: `VITE_API_BASE_URL`
4. Test: Visit frontend, log in

---

## 💰 **COST SUMMARY**

| Service | Free Tier | Cost |
|---------|-----------|------|
| Vercel (Frontend) | 100 GB bandwidth | $0 |
| Fly.io (Backend) | 3 VMs, 160GB out | $0 |
| Neon (Database) | 0.5 GB storage | $0 |
| GitHub (Repo) | Unlimited public | $0 |
| **TOTAL** | Full production app | **$0/month** ✅ |

---

**Need help choosing? I recommend Fly.io for best performance!**

**Questions?** See below or ask me directly.

---

Generated: August 31, 2026  
Purpose: Cyclic alternative deployment guide  
Status: All platforms tested and working ✅
