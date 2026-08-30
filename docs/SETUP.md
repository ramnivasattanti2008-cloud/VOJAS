# VOJAS Setup Guide

## Prerequisites

| Tool | Minimum Version | Check Command |
|------|---------------|---------------|
| Node.js | 18.x | `node --version` |
| npm | 9.x | `npm --version` |
| Git | 2.x | `git --version` |
| VS Code | Latest | `code --version` |

## Installation

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/vojas.git
cd vojas
```

### 2. Install Root Dependencies
```bash
npm install
```

### 3. Install Frontend Dependencies
```bash
cd frontend
npm install
```

### 4. Install Backend Dependencies
```bash
cd ../backend
npm install
```

### 5. Setup Environment
```bash
# Copy environment template
cp .env.example .env
# Edit .env with your values (for now, defaults are fine for local dev)
```

### 6. Setup Database
```bash
cd backend
npx prisma generate
npx prisma db push
```

### 7. Run Development Servers
```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:5000
- API Health: http://localhost:5000/api/v1/health

## VS Code Extensions (Recommended)
- ESLint
- Prettier
- Prisma
- Tailwind CSS IntelliSense
- TypeScript Vue Plugin (or React)

## Troubleshooting

### Port Already in Use
```bash
# Find and kill process on port 5173 or 5000
netstat -ano | findstr :5173
taskkill /PID PROCESS_ID /F
```

### Prisma Errors
```bash
cd backend
npx prisma generate
npx prisma db push --force-reset  # WARNING: deletes all data
```

### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm install
```

## Git Workflow
```bash
# Create feature branch
git checkout -b feature/your-feature-name

# Make changes, commit
git add .
git commit -m "feat: add your feature"

# Push to GitHub
git push -u origin feature/your-feature-name

# Create Pull Request on GitHub
```
