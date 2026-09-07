# VOJAS Backup & Recovery

**Project:** VOJAS NEO Monorepo
**Date:** 2026-09-07
**Phase:** M17 Reliability, Observability & Ops Hardening

---

## Backup Strategy

### Database (Postgres / PostGIS)

**Production environment** (Neon / Render):
- **Automatic backups**: enabled by platform, default 7-day retention (free tier) or 30-day (pro)
- **Point-in-time recovery (PITR)**: enabled on pro tier
- **Frequency**: continuous (write-ahead log shipping)
- **Storage**: managed by platform (S3-backed)
- **Verification**: monthly restore drill to staging

**Local development**:
- Manual `pg_dump` recommended before any schema change
- Docker volume: `vojas_postgres_data` — back up by stopping container and copying volume

### File Storage (Uploads)

**Production**:
- Reports/media uploaded to disk under `UPLOAD_DIR` (default: `uploads/reports/`)
- These are NOT yet backed up automatically — Phase 18: migrate to S3 or equivalent
- Until then, treat as ephemeral; document this in the admin UI

**Local**:
- Mount as Docker volume for persistence across container restarts

### Audit Log (Cold Storage)

**Recommended** (Phase 18+):
- Daily export of `audit_events` older than 90 days to S3 / Glacier
- Use `COPY` command or background worker
- Preserves compliance trail without bloating production DB

### Configuration / Secrets

- All secrets live in environment variables (`.env` locally, secrets manager in production)
- Never commit secrets to git
- Rotate secrets quarterly (JWT_SECRET, DB password, CDSE credentials, AI provider keys)

---

## Recovery Process

### Scenario 1: Database Corruption / Accidental Drop

```bash
# 1. Stop the API to prevent further writes
kubectl scale deployment vojas-api --replicas=0
# (or: docker compose stop api)

# 2. Identify the latest good backup
pg_dump --list-vojas-backups  # (custom script, see below)

# 3. Restore from backup (full restore)
pg_restore -h localhost -U postgres -d vojas_new /path/to/backup.dump
# Or for PITR:
psql -h localhost -U postgres -d vojas_new \
     -c "SELECT pg_wal_replay_resume();"

# 4. Verify integrity
psql -h localhost -U postgres -d vojas_new -c "SELECT COUNT(*) FROM projects;"

# 5. Rename to production
psql -c "ALTER DATABASE vojas RENAME TO vojas_old;"
psql -c "ALTER DATABASE vojas_new RENAME TO vojas;"

# 6. Restart API
kubectl scale deployment vojas-api --replicas=1
```

### Scenario 2: Migration Failure Mid-Deploy

```bash
# 1. Check current migration status
cd packages/db
pnpm prisma migrate status

# 2. If a migration failed halfway:
#    - Inspect the failed migration in prisma/migrations/
#    - Manually fix the DB to match the pre-migration state
#    - Mark as applied: pnpm prisma migrate resolve --applied <migration_name>
#    OR: mark as rolled back: pnpm prisma migrate resolve --rolled-back <migration_name>

# 3. Verify the app boots
pnpm -F @vojas/api build
```

### Scenario 3: Service Down (DB Connection Lost)

```bash
# 1. Check DB status
psql -h $DB_HOST -U $DB_USER -d vojas -c "SELECT 1;"

# 2. Check connection pool exhaustion
psql -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Restart the API (clears in-process pool)
kubectl rollout restart deployment vojas-api

# 4. If persistent, check:
#    - DB disk space: SELECT * FROM pg_disk_usage;
#    - Long-running queries: SELECT pid, query, state FROM pg_stat_activity WHERE state = 'active';
#    - Lock contention: SELECT * FROM pg_locks WHERE NOT granted;
```

### Scenario 4: Satellite / External API Outage

The system is designed to fail gracefully:
- CDSE outage → satellite jobs return `NO_DATA` or `PROVIDER_ERROR`
- AI provider not configured → `NullAIProvider` is used (operations continue, AI features degraded)
- Map provider outage → maps page shows cached tiles from service worker

**No data loss occurs**; only data freshness is affected.

---

## RPO / RTO

| Component | RPO (Recovery Point Objective) | RTO (Recovery Time Objective) |
|-----------|-------------------------------|-------------------------------|
| **Database** | 1 hour (with PITR) / 24 hours (daily backup) | 30 minutes (full restore) / 5 minutes (PITR) |
| **API service** | N/A (stateless) | 2 minutes (container restart) |
| **File uploads** | 24 hours (manual) | 1 hour (manual recovery) |
| **Audit log** | 1 hour (live) / 24 hours (archive) | 30 minutes (live query) |
| **Configuration** | 1 hour (env vars) | 5 minutes (re-deploy) |

**Definitions**:
- **RPO**: maximum acceptable data loss measured in time
- **RTO**: maximum acceptable downtime measured in time

---

## Migration Safety

### Pre-Deploy Checklist

1. **Test on staging** with production-size data sample
2. **Run `prisma migrate diff`** to preview the SQL:
   ```bash
   cd packages/db
   pnpm prisma migrate diff --from-migrations ./prisma/migrations \
     --to-schema-datamodel ./schema.prisma --script
   ```
3. **Check for destructive changes**:
   - DROP COLUMN
   - ALTER COLUMN with type change
   - DROP TABLE
4. **Verify backout plan** exists (rollback migration written but not applied)

### Destructive Change Policy

Multi-step deploys are required for:

1. **Removing columns**:
   - Step 1: stop reading from column (deploy code)
   - Step 2: drop column (next deploy, ≥ 1 week later)
2. **Renaming columns**:
   - Step 1: add new column, dual-write
   - Step 2: backfill old data into new column
   - Step 3: switch reads to new column
   - Step 4: drop old column
3. **Changing enums**:
   - Step 1: add new enum values
   - Step 2: migrate existing rows
   - Step 3: remove old values (≥ 1 month later)
4. **Adding NOT NULL columns**:
   - Step 1: add as nullable
   - Step 2: backfill default value
   - Step 3: add NOT NULL constraint

### Migration Commands

```bash
# Create a new migration
cd packages/db
pnpm prisma migrate dev --name add_audit_metadata_field

# Apply pending migrations
pnpm prisma migrate deploy

# Check status
pnpm prisma migrate status

# Resolve a failed migration (if you fixed it manually)
pnpm prisma migrate resolve --applied 20260907_add_audit_metadata_field
pnpm prisma migrate resolve --rolled-back 20260907_broken_migration
```

### Schema Validation

Before every deploy, run:
```bash
# Verify schema matches migrations
pnpm prisma migrate diff --from-migrations ./prisma/migrations \
  --to-schema-datamodel ./schema.prisma --shadow-database-url $SHADOW_DB_URL
```

If this returns ANY output, you have a schema drift — investigate before deploying.

---

## Rollback Plan

### Code Rollback (Easy)

The platform (Render / Vercel) keeps the previous deploy live. To roll back:

```bash
# Render
render rollback --service vojas-api --to-deploy <deploy-id>

# Vercel
vercel rollback vojas-frontend --to <deployment-id>
```

Or via git:
```bash
git revert HEAD
git push origin main
# Platform auto-redeploys
```

### Database Rollback (Hard)

**Forward-only is the policy**. We do NOT roll back DB changes. Instead:

1. Write a NEW migration that reverts the change
2. Deploy the new migration + corresponding code

Example: if migration `20260907_add_audit_metadata_field` added a column that breaks production:

```bash
# 1. Write a forward migration that drops the column
cd packages/db
pnpm prisma migrate dev --name drop_audit_metadata_field

# 2. Update code to not reference the column
# 3. Deploy migration + code together
```

### Why No DB Rollback?

- Prisma migrations assume forward-only progression
- Rolling back risks data loss for rows that depended on the new column
- Forward fixes are auditable and reversible later if needed
- Most "bad" migrations are easily patched without data loss

---

## Disaster Recovery Drill

**Recommended schedule**: quarterly

### Drill Procedure

1. **Pick a recent backup** (e.g., 7 days old)
2. **Spin up a fresh DB** in staging
3. **Restore the backup**
4. **Run `prisma migrate deploy`** to apply any migrations created after the backup
5. **Boot the API** pointing at the restored DB
6. **Run smoke tests**:
   - Health endpoints return 200
   - Login as test user
   - List projects
   - Submit a citizen report
   - Run risk analysis on a project
7. **Time the entire process** — this is your real RTO
8. **Document any failures** and fix the runbook

### Post-Drill Findings

Record in `docs/operations/dr-drills/`:
- Date of drill
- Backup age used
- Time to restore
- Issues found
- Improvements made

---

## Operational Runbooks

### Slow Queries

```sql
-- Find the slowest queries in the last hour
SELECT pid, now() - query_start AS duration, query, state
FROM pg_stat_activity
WHERE state = 'active'
  AND now() - query_start > interval '5 seconds'
ORDER BY duration DESC;
```

### Connection Pool Exhaustion

```sql
-- See how many connections are in use
SELECT count(*) FROM pg_stat_activity;

-- Identify connection sources
SELECT application_name, count(*)
FROM pg_stat_activity
GROUP BY application_name
ORDER BY count DESC;
```

### Disk Space

```sql
-- Database size
SELECT pg_size_pretty(pg_database_size('vojas'));

-- Largest tables
SELECT relname, pg_size_pretty(pg_total_relation_size(relid))
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(relid) DESC
LIMIT 10;
```

---

*Document maintained by M17 — Reliability, Observability & Ops Hardening*
