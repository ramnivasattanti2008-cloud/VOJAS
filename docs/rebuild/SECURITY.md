# VOJAS 2.0 — Security Model

This document describes the security posture of VOJAS 2.0, including authentication, authorization, input validation, rate limiting, audit logging, and PII handling.

VOJAS handles sensitive government accountability data and citizen-submitted reports. Security is not an afterthought — it is designed into every layer.

---

## 1. Authentication

| Item | Implementation |
|---|---|
| Algorithm | JWT HS256 (explicit, not Node's default) |
| Secret | `JWT_SECRET` env var, must be >= 32 chars in production |
| Token lifetime | 7 days (ACCESS_TOKEN), 30 days (REFRESH_TOKEN) |
| Storage | `localStorage` on client; `Authorization: Bearer` header |
| Password hashing | `bcryptjs`, cost factor 12 |
| Password policy | >= 10 chars, mixed case + digit required |
| Login rate limit | 10 requests / 15 min / IP |
| Failed login | Logged to `AuditLog` with `LOGIN_FAILED` action |
| Refresh rotation | Every refresh issues new refresh token, old invalidated |

### Token structure

```typescript
// packages/domain/src/auth.ts
interface JWTPayload {
  sub: string;      // userId (UUID)
  email: string;
  role: Role;       // ADMIN | OFFICER | REVIEWER | ...
  iat: number;      // issued at
  exp: number;      // expiry timestamp
}
```

### Production enforcement

The API **refuses to boot** if `NODE_ENV=production` and `JWT_SECRET` is missing or shorter than 32 chars.

```typescript
// apps/api/src/config/validate.ts
if (process.env.NODE_ENV === 'production') {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and >= 32 characters in production');
  }
}
```

### Known limitation

JWT in `localStorage` is readable by XSS attacks. The correct production fix is `httpOnly; Secure; SameSite=Strict` cookies, but this requires HTTPS. The httpOnly cookie migration is tracked as a post-SIH task.

---

## 2. Role-Based Access Control (RBAC)

### Roles

```typescript
enum Role {
  ADMIN        = 'Full system access, PII viewing, user management',
  OFFICER      = 'Manage projects, expenditures, reports',
  REVIEWER     = 'Review queue, report status transitions',
  ANALYST      = 'Anomaly scan, acknowledge, resolve',
  FIELD_OFFICER = 'Field inspections only',
  MP           = 'View own constituency projects',
  CONTRACTOR   = 'Submit progress reports',
  CITIZEN      = 'Submit reports',
  VIEWER       = 'Read-only access',
}
```

### Permission matrix

| Action | ADMIN | OFFICER | REVIEWER | ANALYST | VIEWER |
|---|---|---|---|---|---|
| View all projects | Yes | Yes | Yes | Yes | Yes |
| Create/edit projects | Yes | Yes | No | No | No |
| View redacted reports | Yes | Yes | Yes | Yes | Yes |
| View full PII (reports) | Yes | No | No | No | No |
| Transition report status | Yes | Yes | Yes | No | No |
| Run anomaly scan | Yes | No | No | Yes | No |
| Resolve anomaly | Yes | No | No | Yes | No |
| Escalate to law enforcement | Yes | No | No | Yes | No |
| Manage users | Yes | No | No | No | No |
| View audit log | Yes | No | No | No | No |
| Upload documents | Yes | Yes | No | No | No |

### Server-side enforcement

RBAC is enforced in the Express middleware — **not** in the UI. UI hiding is a convenience, not a security control.

```typescript
// apps/api/src/middleware/authorize.ts
export function authorize(...allowedRoles: Role[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user; // set by authenticate middleware
    if (!user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    if (!allowedRoles.includes(user.role)) {
      // Log unauthorized attempt
      await auditLogService.log({
        userId: user.id,
        action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
        resource: req.path,
        resourceId: 'N/A',
        details: { role: user.role, attempted: req.method + ' ' + req.path },
      });
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  };
}
```

Usage:
```typescript
// apps/api/src/routes/anomalies.ts
router.post('/scan',
  authenticate,
  authorize('ADMIN', 'ANALYST'),
  anomalyController.scan
);
```

---

## 3. Input Validation

All request bodies and query parameters are validated with Zod before reaching business logic.

### Request body validation

```typescript
// packages/domain/src/schemas/projects.ts
export const projectsCreateSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  sector: z.nativeEnum(ProjectSector),
  approvedAmount: z.number().positive('Amount must be positive').max(1e9),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

export type ProjectsCreateInput = z.infer<typeof projectsCreateSchema>;
```

```typescript
// apps/api/src/controllers/projectController.ts
export async function createProject(req: Request, res: Response) {
  const result = projectsCreateSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: 'Validation failed',
      details: result.error.flatten().fieldErrors,
    });
  }
  // result.data is typed as ProjectsCreateInput
  const project = await projectService.create(result.data);
  res.status(201).json({ data: project });
}
```

### Query parameter validation

```typescript
// packages/domain/src/schemas/common.ts
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional(),
});

export const projectFiltersSchema = paginationSchema.extend({
  state: z.string().optional(),
  district: z.string().optional(),
  sector: z.nativeEnum(ProjectSector).optional(),
  status: z.nativeEnum(ProjectStatus).optional(),
  riskLevel: z.nativeEnum(RiskLevel).optional(),
  search: z.string().max(200).optional(),
});
```

### Response validation

Output is validated in development and test environments using a response wrapper:

```typescript
// packages/domain/src/utils/validateResponse.ts
export function validateResponse<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(`Response validation failed: ${result.error.message}`);
  }
  return result.data;
}
```

---

## 4. Output Sanitization

### Fields never returned to clients

| Field | Reason |
|---|---|
| `User.passwordHash` | Never exposed — authentication uses bcrypt comparison |
| `Report.ipAddress` | Used for rate limiting, not exposed |
| `Report.userAgent` | Used for audit, not exposed |
| `Report.reporterPhone` | Redacted for non-ADMIN roles |
| `Report.reporterEmail` | Redacted for non-ADMIN roles |
| `Report.reporterName` | Redacted for non-ADMIN roles |
| `Session` (refresh tokens) | Stored server-side only |

### PII redaction for non-ADMIN roles

Reports returned to non-ADMIN users have PII fields replaced:

```typescript
// packages/domain/src/services/redactionService.ts
export function redactReport(report: Report, requestingRole: Role): Report {
  if (requestingRole === 'ADMIN') return report;

  const redacted = { ...report };
  redacted.reporterName = '[REDACTED]';
  redacted.reporterEmail = '[REDACTED]';
  redacted.reporterPhone = '[REDACTED]';
  redacted.title = redactText(report.title);
  redacted.description = redactText(report.description);
  redacted.locationDesc = report.locationDesc
    ? redactText(report.locationDesc)
    : null;
  return redacted;
}
```

PII patterns redacted in text fields:
- **Indian phone numbers**: `+91 98765 43210`, `09876543210`
- **Email addresses**: `name@example.com`
- **Aadhaar numbers**: `1234 5678 9012` (12-digit patterns)
- **PAN numbers**: `ABCDE1234F`

---

## 5. Error Handling

All errors are typed and never expose internal details to clients.

### Error hierarchy

```typescript
// packages/domain/src/errors/index.ts
export class AppError extends Error {
  constructor(
    public message: string,
    public statusCode: number = 500,
    public code: string = 'INTERNAL_ERROR',
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, 400, 'VALIDATION_ERROR', details);
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(`${resource} not found${id ? `: ${id}` : ''}`, 404, 'NOT_FOUND');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to perform this action') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}
```

### Error response format

```typescript
// All errors return this shape:
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "details": {
    "approvedAmount": ["Number must be positive"]
  }
}
```

Stack traces are **never** returned to clients. In production, a generic `Something went wrong` message is returned; the full error is logged server-side.

---

## 6. Rate Limiting

Implemented via `express-rate-limit`. All limits are per IP address.

| Scope | Limit | Window | Notes |
|---|---|---|---|
| `/api/v1/*` (general) | 120 | 1 minute | Normal API usage |
| `/api/v1/auth/*` | 10 | 15 minutes | Login, register, refresh |
| `/api/v1/reports/submit` (public) | 5 | 1 hour | Citizen report submission |
| `/api/v1/documents/upload` | 20 | 1 hour | Document upload |
| Health check | No limit | — | `GET /health` |

Rate limiting is **skipped in `NODE_ENV=test`** to prevent test flakiness.

When rate limited, clients receive:
```json
{
  "error": "Too many requests",
  "code": "RATE_LIMITED",
  "retryAfter": 3600
}
```
HTTP status: `429 Too Many Requests`

---

## 7. CORS Configuration

CORS is explicit — no wildcard origins.

```typescript
// apps/api/src/middleware/cors.ts
app.use(cors({
  origin: process.env.CLIENT_BASE_URL, // e.g. https://vojas-frontend.vercel.app
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 hours — preflight cache
}));
```

For local development, `CLIENT_BASE_URL` defaults to `http://localhost:5173` (Vite dev server). The Express API must never use `*` as the origin.

---

## 8. Security Headers

Implemented via `helmet` middleware in the Express app.

```typescript
// apps/api/src/app.ts
import helmet from 'helmet';

app.use(helmet({
  hsts: process.env.NODE_ENV === 'production' ? {
    maxAge: 31536000,        // 1 year
    includeSubDomains: true,
    preload: true,
  } : false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CLIENT_BASE_URL],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Other headers set by helmet:
// - X-Content-Type-Options: nosniff
// - X-Frame-Options: DENY
// - Referrer-Policy: strict-origin-when-cross-origin
// - X-Download-Options: noopen
// - X-DNS-Prefetch-Control: off
```

CSP is set with a basic policy. The full CSP with nonces requires frontend build integration (planned for Phase 54).

---

## 9. Audit Logging

All state-changing operations write to `AuditLog`. The table is append-only — no UPDATE or DELETE routes exist.

```typescript
// Every action logged
await auditLogService.log({
  userId: req.user.id,
  action: 'ANOMALY_RESOLVE',
  resource: 'Anomaly',
  resourceId: anomaly.id,
  details: {
    projectId: anomaly.projectId,
    resolution: req.body.resolution,
  },
  ipAddress: req.ip,
});
```

Audit log entries include:
- `userId` — who performed the action
- `action` — what happened (verb)
- `resource` — what entity type
- `resourceId` — which specific entity
- `details` — structured JSON with relevant context
- `ipAddress` — client IP (not exposed in any read endpoint)
- `createdAt` — timestamp (immutable)

**PII viewing audit**: Every request that returns redacted data logs `REPORT_VIEWED_REDACTED` with the requesting role and redacted field count.

---

## 10. PII Handling

### What PII is stored

- **Reports**: `reporterName`, `reporterEmail`, `reporterPhone`, `ipAddress`, `userAgent`
- **DevelopmentRequests**: `supporterName`, `supporterEmail` (anonymous by default)
- **WhistleblowerReport**: full reporter details (stored but highly restricted)

### What PII is NOT stored

- Aadhaar numbers (explicitly rejected in validation)
- Bank account details (out of scope)
- Passwords (bcrypt hashed, never stored in plaintext)

### PII redaction rules

| Field | ADMIN | OFFICER | REVIEWER | ANALYST | VIEWER |
|---|---|---|---|---|---|
| `reporterName` | Full | REDACTED | REDACTED | REDACTED | REDACTED |
| `reporterEmail` | Full | REDACTED | REDACTED | REDACTED | REDACTED |
| `reporterPhone` | Full | REDACTED | REDACTED | REDACTED | REDACTED |
| Text field PII | Full | Masked | Masked | Masked | Masked |
| `isAnonymous` flag | Full | Full | Full | Full | Full |

Anonymous reports (`isAnonymous: true`) have `reporterName/Email/Phone` stored as `null` and returned as `null` (not `[REDACTED]`).

### In-text PII masking

```typescript
// packages/domain/src/utils/piiPatterns.ts
const PHONE_PATTERN = /(\+91[\s.-]?)?(\d{5}[\s.-]?\d{5})/g;
const EMAIL_PATTERN = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const AADHAAR_PATTERN = /\b\d{4}[\s.-]?\d{4}[\s.-]?\d{4}\b/g;
const PAN_PATTERN = /[A-Z]{5}\d{4}[A-Z]/g;

export function maskPII(text: string): string {
  return text
    .replace(PHONE_PATTERN, '[PHONE]')
    .replace(EMAIL_PATTERN, '[EMAIL]')
    .replace(AADHAAR_PATTERN, '[AADHAAR]')
    .replace(PAN_PATTERN, '[PAN]');
}
```

---

## 11. Secret Management

Secrets are supplied via environment variables. No secrets are committed to the repository.

### Required secrets

| Variable | Required in prod | Purpose |
|---|---|---|
| `JWT_SECRET` | Yes (>= 32 chars) | JWT signing key |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `CLIENT_BASE_URL` | Yes | Allowed CORS origin |
| `NODE_ENV` | Yes | `production` enforces security checks |
| `BCRYPT_ROUNDS` | No | Default: 12 |
| `PORT` | No | Default: 5000 |

### Provider secrets (optional)

| Variable | Enables |
|---|---|
| `OPENAI_API_KEY` | AI document analysis, anomaly explanation |
| `CDSE_CLIENT_ID` / `CDSE_CLIENT_SECRET` | Sentinel-2 scene ingestion |
| `S3_*` (AWS credentials or R2 tokens) | File storage |
| `MAPS_API_KEY` | Google Maps geocoding |

If a provider secret is not set, the null/mock implementation is used automatically.

### Secret rotation

- `JWT_SECRET` should be rotated every 90 days in production
- Rotation invalidates all existing tokens — coordinate with users
- Old secret should be kept for a 24-hour overlap during rotation

---

## 12. File Upload Security

All file uploads go through a multi-layer validation pipeline:

### Layer 1: Extension whitelist

Only these extensions are accepted:
```
.jpg .jpeg .png .webp .pdf
```
All others are rejected with 400.

### Layer 2: MIME type check

Header `Content-Type` is validated against the extension. Mismatch → reject.

### Layer 3: Magic byte verification

The file's first bytes must match the claimed MIME type:

| Type | Magic bytes |
|---|---|
| JPEG | `FF D8 FF` |
| PNG | `89 50 4E 47` |
| WebP | `52 49 46 46 ... 57 45 42 50` |
| PDF | `25 50 44 46` |

Mismatch → file deleted, request rejected.

### Layer 4: Size limit

- **Single file**: 10 MB hard limit
- **Total per request**: 1 file (multipart is not used for large batches)
- **Content-Length header**: enforced before reading body

### Layer 5: Filename sanitization

Original filename is discarded. A random UUID is used as the stored filename. This prevents:
- Path traversal attacks (`../../etc/passwd`)
- Filename collisions
- Extension spoofing

### Storage

- **Dev**: `apps/api/uploads/` (git-ignored)
- **Prod**: Supabase Storage / Cloudflare R2 (CDN-backed, not in web root)

---

## 13. Security Checklist

Before production deployment, verify:

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` >= 32 characters, stored securely (not in source code)
- [ ] `DATABASE_URL` points to production PostgreSQL (not localhost)
- [ ] `CLIENT_BASE_URL` set to exact production frontend URL
- [ ] `HELMET_CSP` configured with known content hashes (Phase 54)
- [ ] Rate limiting enabled (not skipped in production)
- [ ] File upload magic byte verification active
- [ ] Audit logging writing to a non-writable audit store
- [ ] No `.env` files committed to repository
- [ ] `vercel.json` rewrite rules restrict `/api/*` to authorized paths
- [ ] PostgreSQL has `postgis` extension enabled
- [ ] S3/R2 bucket is not publicly writable (private bucket + signed URLs)
