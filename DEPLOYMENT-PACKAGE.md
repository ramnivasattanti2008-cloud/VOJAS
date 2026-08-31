# VOJAS — Free Deployment Package

Everything you need to deploy VOJAS to production for free is ready!

## 📋 What's Included

### Deployment Guides
- **[DEPLOYMENT.md](./DEPLOYMENT.md)** — Complete 5-step deployment guide
  - Step 1: Neon PostgreSQL setup
  - Step 2: Cyclic backend deployment  
  - Step 3: Vercel frontend deployment
  - Step 4: Connect frontend to backend
  - Step 5: Test the live application
  - Troubleshooting, monitoring, scaling

- **[QUICK-DEPLOY.md](./QUICK-DEPLOY.md)** — Fast 15-minute setup
  - Copy-paste environment variables
  - Screenshot walkthroughs
  - Verification steps

### Documentation
- **[README.md](./README.md)** — Project overview with deploy buttons
- **[LICENSE](./LICENSE)** — MIT open source license
- **[CONTRIBUTING.md](./CONTRIBUTING.md)** — How to contribute

### Deployment Scripts
- **[scripts/setup-local.sh](./scripts/setup-local.sh)** — One-command local setup
- **[scripts/pre-deploy-check.sh](./scripts/pre-deploy-check.sh)** — Pre-deployment checklist
- **[scripts/deployment-checklist.sh](./scripts/deployment-checklist.sh)** — Interactive checklist

### Infrastructure Files
- **[cyclic.json](./cyclic.json)** — Cyclic backend configuration
- **[render.yaml](./render.yaml)** — Render blueprint (alternative)
- **[vercel.json](./vercel.json)** — Vercel deployment config
- **[backend/Dockerfile](./backend/Dockerfile)** — Backend containerization
- **[frontend/Dockerfile](./frontend/Dockerfile)** — Frontend containerization
- **[docker-compose.yml](./docker-compose.yml)** — Local development stack

### Environment
- **[.env.example](./.env.example)** — Environment variable template
- **[.gitignore](./.gitignore)** — Git ignore rules (secrets, builds, dependencies)

---

## 🚀 Quick Start (Choose One)

### Path 1: Free Cloud Deploy (Recommended)
**Time:** ~30 minutes | **Cost:** $0/month forever

```bash
# 1. Read the quick guide
cat QUICK-DEPLOY.md

# 2. Follow these steps in order:
# - Create Neon PostgreSQL database (5 min)
# - Deploy backend to Cyclic (5 min)
# - Deploy frontend to Vercel (5 min)
# - Connect them together (5 min)
# - Test login and features (5 min)
```

**Go to:** [QUICK-DEPLOY.md](./QUICK-DEPLOY.md)

### Path 2: Full Setup with Monitoring
**Time:** ~45 minutes | **Cost:** $0/month forever

Detailed guide with:
- Architecture diagram
- Troubleshooting for all platforms
- Monitoring setup
- Scaling strategies
- Alternative platforms

**Go to:** [DEPLOYMENT.md](./DEPLOYMENT.md)

### Path 3: Local Development
**Time:** ~10 minutes | **Cost:** Free

```bash
# Setup everything locally
bash scripts/setup-local.sh

# Run development servers
cd backend && npm run dev      # Terminal 1
cd frontend && npm run dev     # Terminal 2

# Visit http://localhost:5173
```

---

## 📊 What Gets Deployed

```
┌────────────────────────────────────────┐
│      Vercel (Frontend)                 │
│  React 19 + Vite + Tailwind CSS        │
│  Global CDN, automatic deploys         │
└────────────────────────────────────────┘
           ↓ HTTPS
┌────────────────────────────────────────┐
│      Cyclic (Backend)                  │
│  Node.js + Express + TypeScript        │
│  Always-on, automatic deploys          │
└────────────────────────────────────────┘
           ↓ HTTPS
┌────────────────────────────────────────┐
│      Neon (Database)                   │
│  PostgreSQL, managed, auto-backups     │
└────────────────────────────────────────┘
```

---

## 🔐 Demo Accounts

After deployment, log in with:

| Role | Email | Password |
|------|-------|----------|
| Admin | `admin@vojas.gov` | `VojasDemo2026` |
| Officer | `officer@vojas.gov` | `VojasDemo2026` |
| Citizen | `citizen@vojas.gov` | `VojasDemo2026` |

---

## 📋 Deployment Checklist

Before going live, ensure:

- [ ] Code pushed to GitHub
- [ ] .env file NOT committed (check .gitignore)
- [ ] Neon PostgreSQL account created
- [ ] Cyclic backend deployed and healthy
- [ ] Vercel frontend deployed
- [ ] Environment variables set on both platforms
- [ ] Demo login works
- [ ] No CORS errors in browser console
- [ ] All endpoints responding (API health check)
- [ ] Maps display correctly
- [ ] Mobile view works

---

## 🆘 Troubleshooting

### "Network Error" or blank data
→ Check `VITE_API_BASE_URL` in Vercel env vars  
→ Make sure it matches your Cyclic URL exactly  
→ Hard refresh browser (Ctrl+F5)

### "Cannot reach database"
→ Verify `DATABASE_URL` includes `?sslmode=require`  
→ Test connection string locally with `psql`

### CORS errors
→ Check `CLIENT_BASE_URL` on Cyclic  
→ Should be your Vercel frontend URL  
→ Wait 60 sec for Cyclic to redeploy after changing

### Frontend shows old version
→ Vercel cache issue  
→ Go to Vercel dashboard → Deployments → Redeploy

See [DEPLOYMENT.md](./DEPLOYMENT.md) for more troubleshooting.

---

## 📞 Getting Help

- **Vercel Issues:** [vercel.com/support](https://vercel.com/support)
- **Cyclic Issues:** [cyclic.sh/docs](https://docs.cyclic.sh)
- **Neon Issues:** [neon.tech/docs](https://neon.tech/docs)
- **VOJAS Bugs:** Open GitHub issue in this repo
- **General Questions:** See [DEPLOYMENT.md](./DEPLOYMENT.md)

---

## 🤝 Contributing

Want to improve VOJAS?

1. Read [CONTRIBUTING.md](./CONTRIBUTING.md)
2. Fork the repository
3. Create a feature branch
4. Make changes
5. Push and open a Pull Request

---

## 📄 License

MIT License — See [LICENSE](./LICENSE) for details.

You can use VOJAS for any purpose, including commercial use.

---

## 🎯 Next Steps

1. **Start local development:** `bash scripts/setup-local.sh`
2. **Read deployment guide:** Open [QUICK-DEPLOY.md](./QUICK-DEPLOY.md)
3. **Deploy to cloud:** Follow the steps in guide
4. **Test live:** Log in and verify all features work
5. **Share with team:** Send links to frontend and backend URLs

---

**Questions?** Check the relevant guide above, or open an issue on GitHub.

**Ready to deploy?** Start with [QUICK-DEPLOY.md](./QUICK-DEPLOY.md) →
