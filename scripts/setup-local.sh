#!/bin/bash
# ============================================================
# VOJAS Quick Local Setup
# Install dependencies and prepare for local development
# ============================================================

set -e

echo "🚀 VOJAS Local Setup"
echo "===================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check Node version
echo "📦 Checking Node.js version..."
node_version=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$node_version" -lt 20 ]; then
  echo -e "${YELLOW}⚠ Node.js 20+ required (you have v$(node -v))${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"
echo ""

# Setup backend
echo "🔧 Setting up backend..."
if [ ! -d "backend/node_modules" ]; then
  cd backend
  npm install
  cd ..
else
  echo -e "${GREEN}✓ Backend dependencies already installed${NC}"
fi
echo ""

# Setup frontend
echo "🎨 Setting up frontend..."
if [ ! -d "frontend/node_modules" ]; then
  cd frontend
  npm install
  cd ..
else
  echo -e "${GREEN}✓ Frontend dependencies already installed${NC}"
fi
echo ""

# Setup environment variables
echo "🔐 Setting up environment variables..."
if [ ! -f ".env" ]; then
  cp .env.example .env
  echo -e "${GREEN}✓ Created .env from .env.example${NC}"
  echo -e "${YELLOW}⚠ Edit .env with your local configuration${NC}"
else
  echo -e "${GREEN}✓ .env already exists${NC}"
fi
echo ""

# Setup database
echo "📊 Setting up database..."
cd backend
if [ ! -f "prisma/dev.db" ]; then
  echo "  Creating SQLite database..."
  npm run db:push
  echo "  Seeding with demo data..."
  npm run db:seed
  echo -e "${GREEN}✓ Database setup complete${NC}"
else
  echo -e "${GREEN}✓ Database already exists${NC}"
fi
cd ..
echo ""

echo "===================="
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""
echo "Start development:"
echo "  Terminal 1: cd backend && npm run dev"
echo "  Terminal 2: cd frontend && npm run dev"
echo ""
echo "Frontend: http://localhost:5173"
echo "Backend:  http://localhost:5000"
echo ""
echo "Demo login:"
echo "  Email: admin@vojas.gov"
echo "  Password: VojasDemo2026"
