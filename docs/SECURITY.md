# VOJAS — Security Documentation

This document describes the security posture of the VOJAS platform as of
the current build, and the threat model it operates under.

VOJAS is a Smart India Hackathon 2026 prototype for the **AI-Powered
Anomaly Detection in MPLAD Scheme** problem statement. It is not yet
production-deployed, but the security model is designed so that the
only delta between prototype and production is infrastructure hardening,
not code changes.

---

## 1. Threat Model

### What we're defending
- **Citizen anonymity** — reporters may submit anonymously. Their IP
  and user-agent are captured, but never exposed to reviewers.
- **Authority impersonation** — only authorized roles (ADMIN, OFFICER,
  REVIEWER, ANALYST) can transition reports, mark anomalies, verify
  locations, etc.
- **Audit trail integrity** — every state change on a report,
  anomaly, or project is logged. These logs are append-only.
- **PII hygiene** — citizen reports can contain names, phone numbers,
  or addresses. They are stored encrypted-at-rest in production (SQLite
  in dev); access is gated by role.

### What we are NOT defending (out of scope)
- **Nation-state adversaries** — out of scope for a hackathon project.
- **Internal threat from authenticated OFFICERs with full access** —
  out of scope. We trust the role, not the person.
- **Quantum-resistant cryptography** — HS256 is fine for SIH demo.

### What we explicitly refuse to do
- **Use an LLM to make decisions about fraud** — `Anomaly.status`,
  `Report.status`, and `Project.risk` are all set by rules, math, or
  authorized humans. The "AI" is a transformation (PII redaction, log
  summarization), never an arbiter.
- **Expose reporter PII to reviewers** — `reporterName`, `reporterEmail`,
  `reporterPhone`, `ipAddress`, and `userAgent` are automatically redacted
  from every citizen report returned to authenticated users. The original data
  is preserved in the database and is only accessible via the audit-gated
  `/reports/:id/original` endpoint (ADMIN or REVIEWER role, mandatory
  `X-Investigation-Context` header, fully audited).

---

## 2. Authentication

| Item | Implementation |
|---|---|
| Algorithm | JWT HS256 (explicit, not Node's default) |
| Secret | `JWT_SECRET` env var, must be ≥32 chars in production |
| Token lifetime | 7 days, configurable via `JWT_EXPIRES_IN` |
| Storage | `localStorage` on the client; `Authorization: Bearer` header |
| Password hashing | `bcryptjs` (pure JS, no native build), 10 rounds |
| Password policy | ≥10 chars, mixed case + digit |
| Login rate limit | 10 requests / 15 min / IP |
| Failed login | Logged to `AuditLog` with `LOGIN_FAILED` action |
| Logout | Logged to `AuditLog`; stateless JWT, client discards token |

### Production enforcement
- App **refuses to boot** if `NODE_ENV=production` and `JWT_SECRET`
  is missing or shorter than 32 chars.

---

## 3. Authorization (RBAC)

Roles (Prisma enum):
- `ADMIN` — full access
- `OFFICER` — manage projects, expenditures, reports
- `REVIEWER` — review queue, report status transitions
- `ANALYST` — anomaly scan, acknowledge, resolve
- `VIEWER` — read-only

Enforced via `authenticate` + `authorize(...roles)` middleware in
`backend/src/middleware/auth.ts`. Applied per-route in the route files.

---

## 4. Input Validation

- **All request bodies** are validated with Zod schemas in controllers
  before reaching services.
- **All query parameters** (filters, pagination) are validated with
  Zod `safeParse` and bounded — e.g. `limit` capped at 100–500 per
  resource.
- **All file uploads** are validated by:
  1. Extension whitelist (`.jpg .jpeg .png .webp .pdf`)
  2. MIME type check (header — spoofable)
  3. **Magic-byte verification** (content — authoritative)
- 422 → 400 with field-level error details.

---

## 5. Rate Limiting (`express-rate-limit`)

| Scope | Limit | Window |
|---|---|---|
| `/api/v1/*` (general) | 120 | 1 min / IP |
| `/api/v1/auth/*` | 10 | 15 min / IP |
| `/api/v1/reports/submit` (public) | 5 | 1 hour / IP |
| `/api/v1/reports/:id/attachments` (public) | 5 | 1 hour / IP |

Skipped in `NODE_ENV=test` so test suites don't flake.

---

## 6. HTTP Security Headers (`helmet`)

| Header | Value | Why |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevent MIME sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Don't leak referrer |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | HSTS, prod only |
| `X-DNS-Prefetch-Control` | `off` | Reduce info leak |
| `X-Download-Options` | `noopen` | IE legacy |

CSP is **not** set yet — to be added when the frontend has a known
hash/nonce strategy.

---

## 7. CORS

- `origin`: `CLIENT_BASE_URL` env var (default `http://localhost:5173`)
- `credentials: true`
- Methods: `GET, POST, PUT, PATCH, DELETE, OPTIONS`
- Headers: `Content-Type, Authorization`
- Preflight cache: 24 hours

---

## 8. File Upload Hardening

Implemented in `backend/src/utils/storage.ts`:

1. **MIME type** declared by client → checked against whitelist
2. **Extension** from original filename → checked against whitelist
3. **Filename** → replaced with random UUID, original filename discarded
4. **Size** → 10 MB hard limit, single file per request
5. **Magic bytes** → file's first bytes must match the claimed MIME
   type's signature. PDF (`%PDF`), JPEG (`FF D8 FF`), PNG (`89 50 4E 47`),
   WebP (`RIFF...WEBP`). If mismatch, file is deleted and request rejected.
6. **Orphan cleanup** → if the DB write fails after upload, the file
   is removed.

---

## 9. Audit Logging

Every state change writes an `AuditLog` entry:

- `LOGIN`, `LOGOUT`, `LOGIN_FAILED`, `REGISTER` — auth events
- `REPORT_SUBMIT`, `REPORT_STATUS_CHANGE`, `REPORT_ASSIGN`
- `PROJECT_CREATE`, `PROJECT_UPDATE`, `PROJECT_DELETE`
- `EXPENDITURE_CREATE`, `EXPENDITURE_UPDATE`
- `ANOMALY_SCAN`, `ANOMALY_ACKNOWLEDGE`, `ANOMALY_RESOLVE`, `ANOMALY_ESCALATE`
- `LOCATION_VERIFY`
- `USER_ROLE_CHANGE`

Each entry stores: `userId, action, resource, resourceId, details
(JSON), ipAddress, createdAt`. Writes are fire-and-forget — failure
to write an audit log never fails the underlying request, but is
logged to stderr.

---

## 10. CORS / Origin Validation

- API only accepts requests with an `Origin` matching `CLIENT_BASE_URL`
  (configurable per environment).
- All authenticated endpoints require a valid `Authorization: Bearer`
  header.

---

## 11. Secrets Management

| Variable | Required in prod | Default in dev |
|---|---|---|
| `JWT_SECRET` | Yes, ≥32 chars | dev placeholder |
| `DATABASE_URL` | Yes | local SQLite |
| `CLIENT_BASE_URL` | Yes | `http://localhost:5173` |
| `NODE_ENV` | Yes | `development` |
| `PORT` | No | `5000` |
| `BCRYPT_ROUNDS` | No | `10` |

Secrets must be supplied via environment variables. **No secrets
are committed to the repository.** The `.env` file is git-ignored.

---

## 12. Known Limitations & Roadmap

These are *known* gaps, not oversights — they're documented so the
team and reviewers know what would need to be done before a
production deploy.

| Gap | Severity | Phase to fix |
|---|---|---|
| SQLite (dev DB) — no encryption-at-rest | Medium | 15 (PostgreSQL migration) |
| No CSRF token — relies on JWT in header, not cookie | Low (correct) | N/A |
| `localStorage` for JWT — XSS-readable | Medium | 15 (move to httpOnly cookie) |
| No CSP header | Medium | 15 |
| No WAF / IP allowlist | Medium | 15 (infrastructure) |
| No automated dependency scanning in CI | Medium | 15 |
| No SIEM / log aggregation | Low | 15 |
| No DDoS protection at edge | Medium | 15 (infrastructure) |
| LLM-powered features must follow PII redaction gate | Process | All |

---

## 12.1 PII Redaction (Phase 13)

Citizen reports can contain PII: reporter name, email, phone number, and
free-text PII inside the description (e.g. an Indian phone number written
in the description, an Aadhaar ID quoted from a sign).

**Rule:** Reporters' PII is hidden from any role other than `ADMIN`.
This applies to *every* read endpoint (list, detail, search, stats).

### Architecture

```
Report row in DB ──── unchanged (full PII)
       │
       │ reportService.findAll / findById
       ▼
redactionService.redactReport(report, { requestingRole })
       │
       │  ADMIN              → no-op, full PII returned
       │  any other role     → reporterName/Email/Phone → "[REDACTED]"
       │                       title/description/locationDesc/resolution
       │                         → regex-based PII masked
       │                         ([PHONE], [EMAIL], [AADHAAR], [PAN])
       ▼
JSON response
```

### What gets stripped (per role)

| Field                       | ADMIN | OFFICER | REVIEWER | ANALYST | VIEWER |
|-----------------------------|:-----:|:-------:|:--------:|:-------:|:------:|
| `reporterName`              | full  | REDACTED| REDACTED | REDACTED| REDACTED|
| `reporterEmail`             | full  | REDACTED| REDACTED | REDACTED| REDACTED|
| `reporterPhone`             | full  | REDACTED| REDACTED | REDACTED| REDACTED|
| PII inside `description`    | full  | masked  | masked   | masked  | masked |
| PII inside `title`          | full  | masked  | masked   | masked  | masked |
| PII inside `locationDesc`   | full  | masked  | masked   | masked  | masked |
| PII inside `resolution`     | full  | masked  | masked   | masked  | masked |
| `isAnonymous` flag          | full  | full    | full     | full    | full   |

### Anonymous reports

- The `isAnonymous: true` flag is preserved in every response — the act
  of submission is part of the public record, even if the identity is not.
- The `reporterName/Email/Phone` are stored as `NULL` for anonymous reports
  and continue to be returned as `null`. They are not redacted as
  `[REDACTED]` because there is nothing to hide.

### In-text PII patterns

The `redactionService.redactText()` function applies these regex patterns
inside free-text fields:

- **Indian phone numbers** — `+91 98765 43210`, `09876543210`, `98765 43210`
- **Email addresses** — `name@example.com`
- **Aadhaar numbers** — `1234 5678 9012` (12 digits, possibly dashed)
- **PAN numbers** — `ABCDE1234F`

The patterns are intentionally conservative — false positives are better
than leaking a phone number.

### Audit logging

Every request that returns redacted data writes an `AuditLog` entry:

- `action: "REPORT_VIEWED_REDACTED"`
- `resource: "Report"`
- `resourceId: <report id> | "list:<n>,redacted:<k>"` for list views
- `details: { role, redactedCount, total }` for lists
- `details: { role, fieldsRedacted: [...] }` for single views

This gives a full audit trail of who saw redacted data, when, and how
many records were affected — even though the data itself was not visible.

### Why the redaction is at the service return boundary

- The database stores full PII. This is intentional: ADMINs may need to
  investigate, audit, or escalate.
- The transformation is pure — the input is not mutated. The service
  returns a shallow copy with PII fields replaced.
- A bug in the redaction logic cannot corrupt the data. A bug in a
  `WHERE` clause that tried to "filter" PII at the query level could.

---

## 13. Reporting a Vulnerability

For SIH submission, this is a prototype — please report issues to
the development team directly. For a real production deploy, this
section would include a `security@vojas.gov` contact and a coordinated
disclosure policy.
