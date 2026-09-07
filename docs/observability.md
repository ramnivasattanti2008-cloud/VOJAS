# VOJAS Observability

**Project:** VOJAS NEO Monorepo
**Date:** 2026-09-07
**Phase:** M17 Reliability, Observability & Ops Hardening

---

## Logging

### Log Format (Production)

Single-line JSON, one per line, ready for ELK / Loki / CloudWatch ingestion:

```json
{
  "ts": "2026-09-07T10:23:45.123Z",
  "level": "info",
  "msg": "Request completed",
  "requestId": "abc-123-...",
  "method": "GET",
  "path": "/api/v1/projects/xyz",
  "status": 200,
  "durationMs": 42,
  "userId": "user-123"
}
```

### Log Format (Development)

Pretty-printed with ANSI colors:
```
[2026-09-07T10:23:45.123Z] INFO  Request completed {"requestId":"abc-123","status":200,"durationMs":42}
```

### Log Levels

| Level | When | Examples |
|-------|------|----------|
| `error` | 5xx, unhandled exceptions, DB outage | Unhandled error in route, DB connection lost, satellite sync fatal error |
| `warn` | 4xx, AppError subclasses, Prisma errors | NotFound, Validation, rate limit hit, CDSE 5xx |
| `info` | 2xx/3xx, lifecycle events | Request completed, satellite job enqueued, token refresh |
| `debug` | Verbose detail, only in dev | Request body (redacted), internal state |

### Logger API

```typescript
import { logger } from '@/utils/logger';

logger.info('User logged in', { userId, ip });
logger.error('DB connection lost', { error: err.message });
logger.warn('Rate limit exceeded', { ip, path, limit });

// Child logger with pre-bound context
const reqLog = logger.withContext({ requestId: req.requestId, userId });
reqLog.info('Processing report', { reportId });
```

---

## Request IDs

### How It Works

1. Every HTTP request passes through `requestIdMiddleware` (registered BEFORE all routes)
2. The middleware:
   - Reads `X-Request-Id` header from request (if present, valid format)
   - Otherwise generates a fresh UUID v4 via `crypto.randomUUID()`
   - Attaches it to `req.requestId` and `req.startedAt`
   - Echoes it in the `X-Request-Id` response header
3. `requestLogger` (response 'finish' listener) emits a structured log line with the requestId, method, path, status, duration, userId
4. All error responses include the requestId so users can reference it in bug reports

### Why It Matters

- **Distributed tracing** — the same requestId can be used across web → API → DB → external API calls (when propagated)
- **Debugging** — find a single request in millions of log lines
- **Support** — users can provide the requestId from `X-Request-Id` and operators can grep the logs
- **Correlation** — every log line emitted during a request can carry the same requestId

### Request ID Format

- UUID v4 by default
- If client provides a `X-Request-Id`, it must match `^[A-Za-z0-9_\-]{1,64}$` (prevents log injection)
- Invalid client values are silently replaced with a fresh UUID

---

## Health Checks

### Liveness: `GET /health`

- No auth
- No database call
- Returns 200 instantly
- Used by container orchestrators (k8s livenessProbe, Render health check)

```json
{ "status": "ok", "timestamp": "2026-09-07T10:23:45.123Z", "uptimeSeconds": 1234 }
```

### Readiness: `GET /ready` and `GET /api/v1/ready`

- No auth
- Runs `prisma.project.count()` (or `SELECT 1`) to verify DB connectivity
- Returns 200 + DB OK or 503 + DB error
- Used by load balancers to drain traffic when DB is down

```json
{ "status": "ok", "database": "reachable", "projectCount": 60412, "responseTimeMs": 12, "timestamp": "..." }
```

### Smoke Test Compat: `GET /api/v1/health`

- No auth
- DB check with 2s timeout
- Returns `ok`, `degraded` (DB error), or `degraded` (DB timeout)

---

## Audit Trails

### What Is Audited

**Authentication events**:
- `AUTH_LOGIN` (success)
- `AUTH_FAILED_LOGIN` (invalid email OR invalid password)
- `AUTH_LOGOUT`
- `AUTH_TOKEN_REFRESH`
- `USER_CREATED` (registration)

**Report events**:
- `REPORT_SUBMITTED` (public submission, anonymized)
- `REPORT_MEDIA_UPLOADED`
- `REPORT_CLAIMS_EXTRACTED` (AI triage ran)
- `REPORT_STATUS_CHANGED` (operator change)
- `REPORT_MODERATED` (publish/restrict/reject/escalate)

**Other**: User role changes (TODO), admin actions, project updates, finding status changes

### What Is NOT in Audit Logs

- Passwords, password hashes
- Access tokens, refresh tokens (only `sessionId` references)
- Internal error stack traces
- Request bodies (potentially sensitive)

### Audit Log Schema

```typescript
{
  id: string;                  // CUID
  timestamp: Date;             // When the action occurred
  actorId: string;             // User ID, 'anonymous', 'unknown'
  actorType: 'USER' | 'CITIZEN' | 'SYSTEM' | 'ADMIN';
  action: AuditAction;         // Enum: AUTH_LOGIN, REPORT_SUBMITTED, etc.
  entityType: string;          // 'User', 'Report', 'Project', 'RiskFinding', ...
  entityId: string;            // ID of the affected entity
  metadata?: Record<string, unknown>;  // Action-specific context
  ipAddress?: string;          // Request IP (proxied or direct)
  userAgent?: string;          // Browser/client UA
}
```

### Querying Audit Logs

```bash
# All events for a specific entity
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://api.vojas.in/api/v1/audit?entityType=Report&entityId=abc&limit=100"

# All login attempts in the last 24h
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://api.vojas.in/api/v1/audit?action=AUTH_LOGIN&limit=500"

# All events by a specific user
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
     "https://api.vojas.in/api/v1/audit?actorId=user-123&limit=200"
```

### Tamper Protection

**Application-level** (currently):
- `AuditService` exposes only `logEvent`, `getEventsForEntity`, `getEventsByActor`, `getEventsByAction`
- No `update` or `delete` methods (intentional, see auditService.ts comments)
- All write paths funnel through `prisma.auditEvent.create`

**Database-level** (recommended, Phase 18+):
- Add Postgres trigger preventing UPDATE/DELETE on `audit_events`
- Or use append-only table partitioning

**Operational**:
- Backup audit log to cold storage (S3, Glacier) periodically
- Restrict admin access to audit log queries (audit.read permission)

---

## Structured Logs: Common Queries

### Find all errors in the last hour
```bash
# Production: jq against JSON logs
tail -n 10000 app.log | jq -c 'select(.level == "error")' | head -50
```

### Find all requests for a specific user
```bash
tail -n 100000 app.log | jq -c 'select(.userId == "user-123")'
```

### Find slow requests (>1s)
```bash
tail -n 100000 app.log | jq -c 'select(.durationMs > 1000)'
```

### Trace a single request
```bash
# When user provides X-Request-Id from a support ticket
REQUEST_ID="abc-123-..."
grep "$REQUEST_ID" app.log
```

---

## Error Tracking (Future)

The codebase includes hooks for Sentry but does not currently initialize it. To enable:

1. Set `SENTRY_DSN` env var
2. Install `@sentry/node` in `apps/api`
3. Add to `apps/api/src/app.ts`:
```typescript
import * as Sentry from '@sentry/node';
if (process.env.SENTRY_DSN) {
  Sentry.init({ dsn: process.env.SENTRY_DSN, environment: process.env.NODE_ENV });
  Sentry.setupExpressErrorHandler(app);
}
```

When enabled, the `globalErrorHandler` automatically reports to Sentry in addition to logging locally.

---

## Metric Collection (Future)

Currently no metrics are emitted. Recommended Phase 18+ work:

- **Prometheus client** in `/metrics` endpoint
- **Counters**: `http_requests_total{method,path,status}`, `audit_events_total{action}`
- **Histograms**: `http_request_duration_seconds{method,path}`
- **Gauges**: `satellite_jobs_running`, `db_connection_pool_size`
- **Job queue metrics**: `satellite_jobs_by_state{state}`

---

*Document maintained by M17 — Reliability, Observability & Ops Hardening*
