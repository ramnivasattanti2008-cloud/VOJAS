# VOJAS Automated Deployment Guide
## Follow This Exactly — You'll be Live in 30 Minutes!

---

## 📋 **Pre-Deployment Checklist**

Before starting, ensure you have:
- [ ] GitHub account with VOJAS repository pushed
- [ ] Neon account (https://neon.tech) 
- [ ] Cyclic account (https://cyclic.sh)
- [ ] Vercel account (https://vercel.com)

**All free. No credit card required.**

---

## 🚀 **DEPLOYMENT FLOW (30 minutes)**

```
Step 1: Neon Database (5 min)
  ↓
Step 2: Cyclic Backend (5 min)
  ↓
Step 3: Vercel Frontend (5 min)
  ↓
Step 4: Connect Everything (10 min)
  ↓
Step 5: Test & Verify (5 min)
```

---

## 📊 **STEP 1: Create PostgreSQL Database on Neon (5 min)**

### 1.1 Go to Neon
**URL:** https://neon.tech

### 1.2 Create Project
Click **New Project**:
- **Name:** `vojas-prod`
- **Region:** Singapore 
- **Compute:** Free tier

### 1.3 Save Your Connection String
After creation, Neon shows a connection string:
```
postgresql://username:password@ep-xxx-region.neon.tech/vojas?sslmode=require
```

**IMPORTANT:** Copy this entire string and save it securely. You'll need it in Step 2.

### 1.4 Verify Connection (Optional)
```bash
# If you have psql installed:
psql "postgresql://username:password@ep-xxx.neon.tech/vojas?sslmode=require" -c "SELECT 1;"
```
Should return: `(1 row) 1`

✅ **Move to Step 2**

---

## 🔧 **STEP 2: Deploy Backend to Cyclic (5 min)**

### 2.1 Go to Cyclic
**URL:** https://cyclic.sh/dashboard

### 2.2 Create New App
- Click **Deploy**
- Select your `VOJAS` repository from GitHub
- Click **Next**

### 2.3 Set Environment Variables
Click **Variables** and add these exactly:

| Key | Value |
|-----|-------|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `DATABASE_URL` | **← PASTE YOUR NEON STRING HERE** |
| `JWT_SECRET` | **← GENERATE SECURE SECRET BELOW** |
| `JWT_EXPIRES_IN` | `7d` |
| `BCRYPT_ROUNDS` | `10` |
| `CLIENT_BASE_URL` | `https://vojas-frontend.vercel.app` |
| `SEED_ON_BOOT` | `true` |

### 2.4 Generate JWT_SECRET
Run this command in your terminal:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Copy the result (32-character hex string) and paste as `JWT_SECRET`

### 2.5 Click Deploy
- Click **Deploy** button
- Wait 2-5 minutes for backend to build and start
- You'll see a success message with your Cyclic URL

### 2.6 Get Your Backend URL
From Cyclic dashboard, copy your app URL (looks like):
```
https://xxx-cyclic.app
```

### 2.7 Verify Backend Health
```bash
curl https://xxx-cyclic.app/api/v1/health
```
Should return:
```json
{"success":true,"uptime":...}
```

✅ **Move to Step 3**

---

## 🎨 **STEP 3: Deploy Frontend to Vercel (5 min)**

### 3.1 Go to Vercel
**URL:** https://vercel.com/dashboard

### 3.2 Create New Project
- Click **Add New** → **Project**
- Click **Import Git Repository**
- Select `VOJAS` from the list

### 3.3 Configure Project Settings
- **Root Directory:** `./frontend`
- **Framework Preset:** `Vite`
- **Build Command:** `npm ci && npm run build`
- **Install Command:** `npm ci`
- **Output Directory:** `dist`

### 3.4 Set Environment Variables
- Click **Environment Variables**
- Add these:

| Key | Value |
|-----|-------|
| `VITE_API_BASE_URL` | `https://xxx-cyclic.app/api/v1` |
| `VITE_APP_NAME` | `VOJAS` |
| `VITE_ENABLE_RQ_DEVTOOLS` | `false` |

**Replace `xxx-cyclic.app` with your actual Cyclic URL from Step 2**

### 3.5 Click Deploy
- Click **Deploy** button
- Wait 1-2 minutes for build to complete
- You'll see a success message with your Vercel URL

### 3.6 Get Your Frontend URL
From Vercel dashboard, copy your deployment URL (looks like):
```
https://vojas-frontend.vercel.app
```

✅ **Move to Step 4**

---

## 🔗 **STEP 4: Connect Backend to Frontend (10 min)**

### 4.1 Update Cyclic CORS
Now that you have your Vercel URL, update Cyclic:

1. Go to **Cyclic Dashboard** → Your app
2. Click **Variables**
3. Find `CLIENT_BASE_URL` 
4. Change it to your **Vercel frontend URL**:
   ```
   https://vojas-frontend.vercel.app
   ```
5. Click **Save**
6. Cyclic will auto-redeploy (~30 seconds)

### 4.2 Clear Browser Cache (Important!)
To avoid old frontend caching issues:
- **Chrome/Edge:** Press `Ctrl + Shift + Delete`
- **Firefox:** Press `Ctrl + Shift + Delete`
- Select "All time" and "Cached images and files"
- Click "Clear"

✅ **Move to Step 5**

---

## ✅ **STEP 5: Test Everything (5 min)**

### 5.1 Test Frontend Loads
1. Open your Vercel URL: `https://vojas-frontend.vercel.app`
2. You should see the VOJAS login page
3. If blank: hard refresh with `Ctrl + F5`

### 5.2 Test Login
Use demo account:
- **Email:** `admin@vojas.gov`
- **Password:** `VojasDemo2026`

Should see:
- Dashboard with projects
- Maps with locations
- Analytics and data

### 5.3 Test Backend Health
```bash
curl https://xxx-cyclic.app/api/v1/health
```
Should return:
```json
{"success":true,"uptime":123.45}
```

### 5.4 Test Frontend-Backend Connection
- In browser, open Developer Tools (F12)
- Go to Network tab
- Click any button in the app
- Check the API calls — should see `https://xxx-cyclic.app/api/v1/...`
- If 404 or error: check `VITE_API_BASE_URL` in Vercel

✅ **DEPLOYMENT COMPLETE!** 🎉

---

## 📝 **Your Live URLs**

After deployment, you'll have:

| Component | URL |
|-----------|-----|
| Frontend | `https://vojas-frontend.vercel.app` |
| Backend | `https://xxx-cyclic.app` |
| Backend Health | `https://xxx-cyclic.app/api/v1/health` |
| Database | Neon managed (no public URL needed) |

---

## 🆘 **Troubleshooting**

### Problem: "Network Error" or blank data
**Cause:** Frontend can't reach backend  
**Fix:**
1. Check browser console (F12)
2. Hard refresh: `Ctrl + F5`
3. Verify `VITE_API_BASE_URL` in Vercel exactly matches your Cyclic URL
4. Redeploy Vercel: Deployments → Redeploy latest

### Problem: "Cannot reach database"
**Cause:** Wrong connection string  
**Fix:**
1. Go to Neon dashboard
2. Copy fresh connection string
3. Update `DATABASE_URL` in Cyclic
4. Redeploy Cyclic

### Problem: Login fails
**Cause:** Database not seeded or connection issue  
**Fix:**
1. Check Cyclic logs (Logs tab)
2. Verify `SEED_ON_BOOT=true` is set
3. Check `DATABASE_URL` has `?sslmode=require`
4. Redeploy Cyclic

### Problem: Frontend shows old version
**Cause:** Vercel cache  
**Fix:**
1. Go to Vercel dashboard
2. Deployments → Redeploy
3. Clear browser cache: `Ctrl + Shift + Delete`

### Problem: Build fails
**Cause:** Missing variables or wrong Node version  
**Fix:**
1. Check build logs in Vercel/Cyclic dashboard
2. Verify all env vars are set
3. Ensure Node 20+ in `package.json` `engines`

---

## 🔐 **Security Reminders**

- ✅ All connections use HTTPS (automatic)
- ✅ JWT_SECRET is unique and strong (generated)
- ✅ Database password is secure (Neon managed)
- ⚠️ Never commit `.env` files to git
- ⚠️ Keep JWT_SECRET private
- ⚠️ Don't share database URLs publicly

---

## 📊 **What's Running Where**

```
┌──────────────────────────────────────┐
│ Your Browser                         │
├──────────────────────────────────────┤
│ HTTPS://vojas-frontend.vercel.app   │
│ (React 19 + Vite + Tailwind)        │
└────────────────┬─────────────────────┘
                 │ HTTPS
                 ↓
┌──────────────────────────────────────┐
│ Cyclic Backend Server                │
├──────────────────────────────────────┤
│ https://xxx-cyclic.app/api/v1       │
│ (Node.js + Express + TypeScript)    │
└────────────────┬─────────────────────┘
                 │ HTTPS
                 ↓
┌──────────────────────────────────────┐
│ Neon PostgreSQL Database             │
├──────────────────────────────────────┤
│ Managed, Secure, Auto-Backup         │
└──────────────────────────────────────┘
```

---

## 🎯 **Next Steps After Deployment**

1. **Share with team:**
   - Frontend: `https://vojas-frontend.vercel.app`
   - Backend health: `https://xxx-cyclic.app/api/v1/health`

2. **Monitor deployment:**
   - Check Cyclic logs daily
   - Review Neon usage
   - Monitor Vercel analytics

3. **Auto-deployment:**
   - Every push to GitHub → automatic deployment
   - Frontend redeploys in ~1 min
   - Backend redeploys in ~2-3 min

4. **Make changes:**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin main
   # → Automatic deployment starts!
   ```

5. **Scale later:**
   - Vercel: Upgrade for more bandwidth
   - Cyclic: Upgrade for faster builds
   - Neon: Upgrade for more storage
   - All free tier has generous limits

---

## 💬 **Questions?**

- **Deployment issues?** See [DEPLOYMENT.md](./DEPLOYMENT.md)
- **Quick setup?** See [QUICK-DEPLOY.md](./QUICK-DEPLOY.md)
- **All resources?** See [DEPLOYMENT-PACKAGE.md](./DEPLOYMENT-PACKAGE.md)
- **Contributing?** See [CONTRIBUTING.md](./CONTRIBUTING.md)

---

## ✨ **You Did It!**

Congratulations! 🎉

You now have a **fully functional, production-grade VOJAS deployment** running on free infrastructure with:
- Global CDN for fast frontend delivery
- Always-on backend server
- Managed PostgreSQL database
- Automatic deployments on every push
- Zero monthly cost

**VOJAS is now live for the world to see!** 🚀

---

**Questions? Need help? Open an issue on GitHub or check the troubleshooting section above.**
