#!/bin/bash
# ============================================================
# VOJAS Deployment Pre-Check Script
# Run this before deploying to catch common issues
# ============================================================

set -e

echo "🔍 VOJAS Deployment Pre-Check"
echo "=============================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1 exists"
    return 0
  else
    echo -e "${RED}✗${NC} $1 missing"
    return 1
  fi
}

check_command() {
  if command -v $1 &> /dev/null; then
    echo -e "${GREEN}✓${NC} $1 installed"
    return 0
  else
    echo -e "${RED}✗${NC} $1 not installed"
    return 1
  fi
}

# Check Node.js
echo "📦 Node.js & npm"
check_command "node"
check_command "npm"
node_version=$(node -v)
echo "   Version: $node_version"
echo ""

# Check required files
echo "📄 Project Files"
check_file ".env.example"
check_file ".gitignore"
check_file "LICENSE"
check_file "DEPLOYMENT.md"
check_file "CONTRIBUTING.md"
check_file "README.md"
check_file "backend/Dockerfile"
check_file "backend/package.json"
check_file "backend/tsconfig.json"
check_file "backend/prisma/schema.prisma"
check_file "frontend/package.json"
check_file "frontend/tsconfig.json"
check_file "frontend/vite.config.ts"
check_file "cyclic.json"
check_file "render.yaml"
echo ""

# Check backend dependencies
echo "🔧 Backend Setup"
if [ -d "backend/node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules installed"
else
  echo -e "${YELLOW}⚠${NC} node_modules not installed. Run: cd backend && npm install"
fi
echo ""

# Check frontend dependencies
echo "🎨 Frontend Setup"
if [ -d "frontend/node_modules" ]; then
  echo -e "${GREEN}✓${NC} node_modules installed"
else
  echo -e "${YELLOW}⚠${NC} node_modules not installed. Run: cd frontend && npm install"
fi
echo ""

# Check TypeScript
echo "🏗️  TypeScript Compilation"
cd backend
if npm run build 2>&1 | grep -q "error"; then
  echo -e "${RED}✗${NC} Backend compilation failed"
  exit 1
else
  echo -e "${GREEN}✓${NC} Backend compiles successfully"
fi
cd ..
echo ""

# Check frontend TypeScript
cd frontend
if npm run typecheck 2>&1 | grep -q "error"; then
  echo -e "${RED}✗${NC} Frontend type checking failed"
  exit 1
else
  echo -e "${GREEN}✓${NC} Frontend type checking passed"
fi
cd ..
echo ""

# Check linting
echo "🎯 Code Quality"
cd frontend
if npm run lint 2>&1 | grep -q "error"; then
  echo -e "${YELLOW}⚠${NC} Frontend linting issues found"
else
  echo -e "${GREEN}✓${NC} Frontend linting passed"
fi
cd ..
echo ""

# Environment variables check
echo "🔐 Environment Variables"
if [ -f ".env" ]; then
  echo -e "${GREEN}✓${NC} .env file exists"
  if grep -q "DATABASE_URL" .env; then
    echo -e "${GREEN}✓${NC} DATABASE_URL configured"
  else
    echo -e "${RED}✗${NC} DATABASE_URL not found in .env"
  fi
else
  echo -e "${YELLOW}⚠${NC} .env not found. Copy from .env.example and configure:"
  echo "   cp .env.example .env"
fi
echo ""

echo "=============================="
echo -e "${GREEN}✓ Pre-check complete!${NC}"
echo ""
echo "Next steps:"
echo "1. Ensure all ✓ items passed"
echo "2. If any ✗ items, fix them manually"
echo "3. Run: npm run dev (in separate terminals)"
echo "4. Test locally at http://localhost:5173"
echo "5. Push to GitHub: git push origin main"
echo "6. Deploy: See DEPLOYMENT.md for instructions"
