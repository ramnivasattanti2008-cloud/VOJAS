#!/bin/bash
# ============================================================
# VOJAS Deployment Checklist Generator
# Creates an interactive checklist for production deployment
# ============================================================

echo "📋 VOJAS Production Deployment Checklist"
echo "========================================"
echo ""
echo "This checklist ensures your deployment is production-ready."
echo "Work through each section and mark items as complete."
echo ""

# GitHub & Repository
echo "1️⃣  GitHub & Repository"
echo "  [ ] Repository is public (or shared with team)"
echo "  [ ] README.md is up to date with project description"
echo "  [ ] DEPLOYMENT.md is in root directory"
echo "  [ ] LICENSE file is present (MIT recommended)"
echo "  [ ] .gitignore includes: node_modules, .env, dist, build"
echo "  [ ] No API keys or secrets in committed code"
echo ""

# Database Setup
echo "2️⃣  Database (Neon PostgreSQL)"
echo "  [ ] Neon account created (neon.tech)"
echo "  [ ] PostgreSQL database created"
echo "  [ ] Connection string copied (looks like: postgresql://user:pass@...)"
echo "  [ ] Connection string tested locally (psql command or app)"
echo "  [ ] Database URL includes ?sslmode=require"
echo ""

# Backend Deployment
echo "3️⃣  Backend (Cyclic.sh)"
echo "  [ ] Cyclic account created (cyclic.sh)"
echo "  [ ] GitHub connected to Cyclic"
echo "  [ ] VOJAS repository selected"
echo "  [ ] Environment variables configured:"
echo "      [ ] NODE_ENV = production"
echo "      [ ] PORT = 3000"
echo "      [ ] DATABASE_URL = <Neon connection string>"
echo "      [ ] JWT_SECRET = <strong random 32+ char secret>"
echo "      [ ] JWT_EXPIRES_IN = 7d"
echo "      [ ] BCRYPT_ROUNDS = 10"
echo "      [ ] CLIENT_BASE_URL = https://your-frontend.vercel.app"
echo "      [ ] SEED_ON_BOOT = true (for first deploy only)"
echo "  [ ] Backend deployed successfully"
echo "  [ ] Health check endpoint responds: https://your-app.cyclic.app/api/v1/health"
echo "  [ ] Cyclic URL copied for next step"
echo ""

# Frontend Deployment
echo "4️⃣  Frontend (Vercel)"
echo "  [ ] Vercel account created (vercel.com)"
echo "  [ ] GitHub connected to Vercel"
echo "  [ ] VOJAS repository imported"
echo "  [ ] Root directory set to: ./frontend"
echo "  [ ] Build command: npm ci && npm run build"
echo "  [ ] Output directory: dist"
echo "  [ ] Environment variables configured:"
echo "      [ ] VITE_API_BASE_URL = https://your-cyclic-app.cyclic.app/api/v1"
echo "      [ ] VITE_APP_NAME = VOJAS"
echo "      [ ] VITE_ENABLE_RQ_DEVTOOLS = false"
echo "  [ ] Frontend deployed successfully"
echo "  [ ] Frontend URL copied"
echo ""

# Testing
echo "5️⃣  Testing"
echo "  [ ] Frontend loads without errors"
echo "  [ ] Login page appears"
echo "  [ ] Demo account login works (admin@vojas.gov / VojasDemo2026)"
echo "  [ ] Dashboard loads with data"
echo "  [ ] Maps display correctly"
echo "  [ ] No CORS errors in browser console"
echo "  [ ] No 404 errors for API calls"
echo "  [ ] Mobile view works (responsive)"
echo ""

# Security
echo "6️⃣  Security & Performance"
echo "  [ ] All connections use HTTPS"
echo "  [ ] JWT_SECRET is strong (32+ random chars, not example)"
echo "  [ ] No .env file in git history"
echo "  [ ] No console.log() with sensitive data in production code"
echo "  [ ] CORS configured for only your frontend domain"
echo "  [ ] Database backups enabled (Neon does automatically)"
echo "  [ ] Rate limiting enabled on backend"
echo ""

# Monitoring
echo "7️⃣  Monitoring & Maintenance"
echo "  [ ] Subscribed to Cyclic status alerts"
echo "  [ ] Neon dashboard bookmarked"
echo "  [ ] Vercel analytics page reviewed"
echo "  [ ] Monitoring alerts configured"
echo "  [ ] Error logging checked"
echo ""

# Documentation
echo "8️⃣  Documentation"
echo "  [ ] README.md has live demo links"
echo "  [ ] DEPLOYMENT.md is complete and tested"
echo "  [ ] API documentation is accessible"
echo "  [ ] Architecture documentation (docs/ARCHITECTURE.md) updated"
echo "  [ ] Troubleshooting guide (DEPLOYMENT.md) is clear"
echo ""

# Final Steps
echo "9️⃣  Final Steps"
echo "  [ ] Team/stakeholders notified of live deployment"
echo "  [ ] Live links shared: frontend and backend health"
echo "  [ ] Auto-deploy verified (push test commit)"
echo "  [ ] Backup plan documented (rollback procedure)"
echo "  [ ] First-week maintenance plan created"
echo ""

echo "✅ If all items are checked, your deployment is production-ready!"
echo ""
echo "Next steps:"
echo "1. Run through the checklist"
echo "2. Fix any unchecked items"
echo "3. Test the live application thoroughly"
echo "4. Share links with team/stakeholders"
echo "5. Monitor logs for 24-48 hours after deployment"
echo ""
