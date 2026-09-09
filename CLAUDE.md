# VOJAS

AI-assisted anomaly and fraud detection for MPLADS project monitoring. Smart India Hackathon — SIH26102, Smart Automation, Blockchain & Cybersecurity.

Stack: pnpm 9.12 monorepo · Next.js 15 + React 19 (apps/web) · Express (apps/api) · Prisma 6.19.3 + PostgreSQL/PostGIS (packages/db) · shared code in packages/{domain,shared,api-client} · TypeScript 5.6.

legacy/ is the superseded v1 app. It is not built, deployed, or linted. Don't fix, refactor, or lint it. frontend/ is a leftover v1 directory with no package.json — same rule.

## The rule that matters most: never fabricate civic data

VOJAS is an anti-corruption tool. A plausible-looking invented number is worse than a blank field, because a citizen or auditor cannot tell the difference. This codebase previously shipped fabricated data in production paths; all of it was deliberately removed. Do not reintroduce it in any form.

Never invent: financial amounts, project counts, completion percentages, invoice/tender/contract values, GSTIN, contractor names, coordinates, audit or case-history entries, satellite metrics, confidence scores, citizen records, or dates.

When data is unavailable, return an explicit state — NOT_AVAILABLE, NO_DATA, NOT_VERIFIED, INSUFFICIENT_DATA, NO_USABLE_OBSERVATION, SOURCE_UNAVAILABLE, PROCESSING_FAILED — and have the UI say so plainly. Math.random() is fine for IDs, job IDs, filenames and reference suffixes. It is never acceptable for a value a user could read as fact.

### Specific traps already fixed, which must not regress

- `documentIntelligence.ts` — no OCR exists. `extractText()` returns an explicit unavailable result with `confidenceScore: 0` and empty fields. It must never populate a field it did not genuinely parse. Machine processing must never set a document to VERIFIED; that is a human decision recorded via `verifiedById`/`verifiedAt`.
- `cdsePixelProvider.ts` — when real Sentinel-2 bands are missing it returns `INSUFFICIENT_IMAGE_QUALITY`. It must never synthesize NDVI/NDBI/BSI and feed them into the change-detection or confidence pipeline.
- `officer/cases/:id/history` — a case history is an audit trail. Inventing entries manufactures evidence about who did what and when. Return empty.
- MP finance / MP intel / citizen watchlist / officer map — these previously rendered invented rupee amounts, project counts, and real records plotted at coordinates derived from array indices. All now show honest empty states.

### Verified schema constraints — check before "fixing" these

These have been confirmed against `packages/db/prisma/schema.prisma`. Do not add migrations to work around them without asking.

- `RiskFinding` has no `notes` column — only `resolution: String?`. Reviewer notes are recorded on the associated `riskEvent` description.
- There is no health-history table or service. `/admin/health/history` intentionally returns `[]`. Do not create a table or synthesize history.
- `MPFinancialSummary.bySector` carries amounts, not project counts. No endpoint currently supplies per-sector counts.

## Commands

```bash
pnpm install --frozen-lockfile
pnpm db:generate                      # root script -> --filter @vojas/db
pnpm run build:packages               # runs prisma generate first
pnpm -r --no-bail typecheck
pnpm lint
pnpm test
pnpm --filter @vojas/web build
pnpm dev                              # web :3000, api :5000
```

Internal deps must use `workspace:*`, never `"*"`. A bare `"*"` makes pnpm resolve `@vojas/*` from the public npm registry — it breaks the install and is a supply-chain risk.

## Phase discipline

Phase 1 (current): make the existing app build, run, test and deploy cleanly. Do not start Phase 2 features — Project Status verification, Verification Method Engine, Evidence Center, weekly satellite timeline, Bribe/ACB, AI expansion, 3D redesign — until Phase 1 passes typecheck, lint, tests, build, runtime and browser verification.

Outstanding Phase 1 item: the ESLint gate (config, install, and driving `pnpm lint` to zero errors). Everything else is verified passing.

## Phase 2 — audit before building

Substantial ingestion infrastructure already exists. Do not write a new pipeline. Read `scripts/ingest/README.md` first, then audit:

- Five adapters in `scripts/ingest/`: `vonter.ts` (60,359 MPLADS recommendations), `dataful.ts` (96,541 expenditure records, 18th Lok Sabha, with vendor data), `opencity.ts` (15th–17th Lok Sabha, 2009–2024), `lgd.ts` (784 canonical districts + LGD codes), `normalize.ts` (post-ingest district matching and vendor aggregates). Shared helpers in `_shared.ts`.
- Idempotency is already designed in — upserts on stable natural keys: `Project` on `(source, sourceWorkId)`, `Vendor` on `(nameNormalized, state)`, `Expenditure` on `(source, sourceTxnId)`, `MP` on `(name, constituency, term)`, `LGDLocation` on `(lgdCode)`. Every script supports `--dry-run`.
- Provenance models already exist: `DataSource` (sourceName, datasetName, department, officialUrl, lastFetched, lastUpdated, format, apiAvailable, status) and `DataSourceRecord` (rawPayload, fetchedAt, transformationStatus, quality, errorMessage). Use these — do not add parallel provenance tables.
- `AuditEvent` is append-only by design; no UPDATE or DELETE routes may exist for it.
- Sources have documented manual-download fallbacks for when the upstream servers are flaky. Prefer those over building a scraper.

So Phase 2 is mostly wiring and verification, not construction. The first question to answer is narrow: does ingestion run against a live database, and does the ingested data actually reach the API and the project pages? Start with `--dry-run` against one source before touching the database.

Work one thing at a time: build → test → verify → next. Leave the tree runnable at every stopping point.

## Non-negotiables

- Never commit `.env` or real secrets. `.env.example` holds names only.
- Never use `any` or `@ts-ignore` to silence an error; fix the cause.
- Never disable an ESLint rule or downgrade errors wholesale to get green. Configure the rule correctly for its context instead.
- Never weaken or delete a failing test to make it pass.
- Never claim a check passed without running it. If something is blocked by the environment, say so and name the exact blocker.
- An AI risk score is evidence for human verification, never proof of fraud.

## Known bug classes worth re-checking

Lint triage has repeatedly surfaced real bugs in this repo, not just style issues. Two patterns recur:

- Silently ignored request parameters — a route destructures a query or body field and never forwards it, so the API appears to filter but returns unfiltered data. Found in `/hotspot`, `/cross-project-patterns`, and risk-finding notes.
- Dead module state — `geeProvider` declared `let ee` and never assigned it, so Earth Engine re-authenticated on every call.

When you see an unused variable in a route handler or a module-level `let`, check whether it indicates one of these before removing it.
