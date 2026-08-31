# Contributing to VOJAS

Thank you for your interest in contributing to VOJAS! This document provides guidelines and instructions for getting involved.

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please be respectful and professional in all interactions.

## Getting Started

### Prerequisites
- Node.js 20+
- npm or yarn
- Git

### Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/your-username/VOJAS.git
   cd VOJAS
   ```

2. **Install dependencies:**
   ```bash
   # Backend
   cd backend && npm install && cd ..
   
   # Frontend
   cd frontend && npm install && cd ..
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your local configuration
   ```

4. **Set up the database:**
   ```bash
   cd backend
   npm run db:push  # Create schema
   npm run db:seed  # Load demo data
   cd ..
   ```

5. **Start development servers:**
   ```bash
   # Terminal 1: Backend
   cd backend && npm run dev
   
   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:5000`.

## Development Workflow

### Branch Naming
- `feature/description` — New features
- `fix/description` — Bug fixes
- `docs/description` — Documentation updates
- `refactor/description` — Code refactoring

### Commit Messages
Use clear, descriptive commit messages:
```
feat: Add anomaly detection for project delays
fix: Handle missing geolocation data gracefully
docs: Update deployment instructions for Render
```

### Code Style

#### TypeScript
- Use strict mode (`strict: true` in tsconfig.json)
- Prefer interfaces over type aliases
- Use meaningful variable names
- Add JSDoc comments for public functions

#### React/Frontend
- Use functional components with hooks
- Keep components small and focused
- Use TypeScript for all components
- Add Tailwind classes instead of custom CSS

#### Backend
- Use Express middleware patterns
- Validate input with Zod
- Use async/await (no callbacks)
- Add proper error handling

### Testing

Before submitting a PR, ensure:
```bash
# Frontend
cd frontend && npm run lint && npm run typecheck && npm test

# Backend (if tests added)
cd backend && npm run lint
```

## Pull Request Process

1. **Create a feature branch:**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes** and commit:
   ```bash
   git add .
   git commit -m "feat: Your feature description"
   ```

3. **Push to GitHub:**
   ```bash
   git push origin feature/your-feature-name
   ```

4. **Open a Pull Request:**
   - Title: Clear, concise description
   - Description: Explain what changed and why
   - Link related issues: `Fixes #123`
   - Ensure CI checks pass

5. **Code review:** Maintainers will review and request changes if needed

## Project Structure

```
VOJAS/
├── frontend/              React + Vite frontend
│   ├── src/
│   │   ├── components/    Reusable UI components
│   │   ├── pages/         Page components
│   │   ├── services/      API client services
│   │   ├── hooks/         Custom React hooks
│   │   ├── types/         TypeScript type definitions
│   │   └── utils/         Utility functions
│   └── vite.config.ts     Vite configuration
│
├── backend/               Express + TypeScript backend
│   ├── src/
│   │   ├── controllers/   Request handlers
│   │   ├── services/      Business logic
│   │   ├── routes/        API endpoints
│   │   ├── middleware/    Express middleware
│   │   ├── models/        Database models
│   │   ├── config/        Configuration
│   │   └── utils/         Utility functions
│   ├── prisma/
│   │   └── schema.prisma  Database schema
│   └── tests/             Test files
│
└── docs/                  Documentation
```

## Key Areas for Contribution

### Frontend
- UI components and design system
- Data visualization improvements
- Performance optimizations
- Accessibility enhancements

### Backend
- API endpoints and services
- Database schema improvements
- Authentication and authorization
- Error handling

### Data & Analysis
- Anomaly detection algorithms
- Risk scoring improvements
- Financial analysis tools
- Geospatial analysis

### Documentation
- API documentation
- Deployment guides
- Architecture decisions
- User guides

## Reporting Issues

When reporting bugs, include:
- Clear title and description
- Steps to reproduce
- Expected vs actual behavior
- Screenshots/logs if applicable
- Your environment (OS, Node version, etc.)

For feature requests, explain:
- Use case and benefit
- Proposed implementation (if applicable)
- Any alternatives considered

## Questions?

- Open a GitHub Discussion for questions
- Check existing issues before asking
- Review docs/README.md first

## Recognition

Contributors will be recognized in:
- This CONTRIBUTING.md file
- Release notes
- GitHub contributors page

Thank you for helping make VOJAS better! 🙌
