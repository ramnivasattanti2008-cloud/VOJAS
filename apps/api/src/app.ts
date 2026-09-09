import * as Sentry from '@sentry/node';
import { expressIntegration, setupExpressErrorHandler } from '@sentry/node';
import { prisma } from '@vojas/db';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import express from 'express';
import { ipKeyGenerator, rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { globalErrorHandler, notFoundHandler } from './middleware/errorHandler.js';
import { requestIdMiddleware, requestLogger } from './middleware/observability.js';
import routes from './routes/index.js';
import { logger } from './utils/logger.js';

const app = express();

app.disable('x-powered-by');
app.use(helmet());

// ── Sentry (optional — graceful no-op if SENTRY_DSN not set) ─────────────────
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    // Auto-instrument Express (request handling, tracing, error capture).
    integrations: [expressIntegration()],
    beforeSend(event) {
      // Strip auth tokens / cookies from all events before sending
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        delete (event.request.headers as Record<string, unknown>).authorization;
        delete (event.request.headers as Record<string, unknown>).cookie;
      }
      if (event.spans) {
        for (const span of event.spans) {
          if (span.data?.authorization) delete span.data.authorization;
          if (span.data?.cookie) delete span.data.cookie;
        }
      }
      return event;
    },
  });
}

// Trust first proxy (for accurate req.ip behind Render/Vercel/Nginx)
app.set('trust proxy', 1);

// Observability — request ID must come BEFORE all routes and middleware,
// including body parsing, so even a malformed-body request is traceable.
app.use(requestIdMiddleware);
app.use(requestLogger);

// ── Body parsing (MUST be before routes, after Sentry handlers) ───────────────
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

// ── Security headers (applied before routes) ────────────────────────────────────
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(self), camera=()');
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

// ── CORS — credentials required for httpOnly cookie auth ───────────────────────
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? 'http://localhost:3000').split(',');
app.use(cors({ origin: allowedOrigins, credentials: true }));

// ── Health checks ────────────────────────────────────────────────────────────
// Liveness — process is up. No DB call, no auth. Safe to use in k8s livenessProbe.
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
  });
});

// Readiness — DB reachable + service ready to serve traffic.
// k8s readinessProbe / load balancers should hit this.
app.get('/ready', async (_req, res) => {
  const startedAt = Date.now();
  try {
    // Simple count query — fails fast if DB is down
    const projectCount = await prisma.project.count();
    const responseTimeMs = Date.now() - startedAt;
    res.json({
      status: 'ok',
      database: 'reachable',
      projectCount,
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    const responseTimeMs = Date.now() - startedAt;
    logger.error('Readiness check failed — DB unreachable', {
      responseTimeMs,
      error: err instanceof Error ? err.message : String(err),
    });
    res.status(503).json({
      status: 'unavailable',
      database: 'unreachable',
      responseTimeMs,
      timestamp: new Date().toISOString(),
    });
  }
});

// Combined status endpoint (for /api/v1/health compatibility)
app.get('/api/v1/health', async (_req, res) => {
  // DB check — never block longer than 2 seconds
  const dbCheck = prisma.$queryRaw`SELECT 1`.then(() => 'ok').catch(() => 'error');
  const timeout = new Promise<'timeout'>((resolve) => setTimeout(() => resolve('timeout'), 2000));
  const result = await Promise.race([dbCheck, timeout]);

  if (result === 'ok') {
    res.json({ status: 'ok', database: 'reachable', timestamp: new Date().toISOString() });
  } else if (result === 'timeout') {
    res.status(503).json({ status: 'degraded', reason: 'DB_TIMEOUT', timestamp: new Date().toISOString() });
  } else {
    res.status(503).json({ status: 'degraded', reason: 'DB_ERROR', timestamp: new Date().toISOString() });
  }
});

// Extended readiness endpoint with more detail
app.get('/api/v1/ready', async (_req, res) => {
  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'reachable',
      responseTimeMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(503).json({
      status: 'unavailable',
      database: 'unreachable',
      error: err instanceof Error ? err.message : 'Unknown error',
      timestamp: new Date().toISOString(),
    });
  }
});

// ── Rate limiting ────────────────────────────────────────────────────────────
// 1) Strict auth rate limit — login & register to defeat credential stuffing
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,                       // 10 attempts / 15 min / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many authentication attempts. Try again in 15 minutes.' } },
});

// 2) Public report submission limiter — prevent spam submissions from a single IP
const reportSubmitLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 5,                        // 5 reports / hour / IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Report submission rate limited. Try again later.' } },
});

// 3) AI / analysis / forecast limiter — expensive compute, cap per user
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,                       // 20 calls / min / user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'AI/analysis rate limit reached. Slow down.' } },
});

// 4) Search limiter — bounded per user/IP
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,                       // 60 searches / min / user
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId ?? ipKeyGenerator(req.ip ?? 'unknown'),
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Search rate limit reached.' } },
});

// Apply auth limiter to login + register BEFORE general limiter
app.use('/api/v1/auth/login', authLimiter);
app.use('/api/v1/auth/register', authLimiter);
app.use('/api/v1/reports', reportSubmitLimiter);
app.use('/api/v1/search', searchLimiter);
// Analytics + risk + forecast are AI/analysis-heavy
app.use('/api/v1/analytics', aiLimiter);
app.use('/api/v1/risk', aiLimiter);
app.use('/api/v1/projects/:id/risk/analyze', aiLimiter);
app.use('/api/v1/projects/:id/forecast', aiLimiter);
app.use('/api/v1/projects/:id/scenario', aiLimiter);

// 5) General limiter — fallback for everything else
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: parseInt(process.env.RATE_LIMIT_GENERAL ?? '300'),
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(generalLimiter);

app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(globalErrorHandler);

// ── Sentry error handler (last in chain) ───────────────────────────────────────
if (process.env.SENTRY_DSN) {
  setupExpressErrorHandler(app);
}

export default app;
