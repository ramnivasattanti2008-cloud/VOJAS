-- Adds the missing GUARDED tier to RiskLevel. The multi-signal risk scorer
-- (packages/domain/src/services/riskEngine/riskScorer.ts) has always scored
-- on a 5-tier scale (LOW/GUARDED/MEDIUM/HIGH/CRITICAL, score bands
-- 0-14/15-34/35-59/60-79/80-100), but this enum only had 4 values — any
-- project scoring in the 15-34 GUARDED band failed to persist its risk
-- assessment at all (Postgres rejected the invalid enum value, silently
-- swallowed by the orchestrator's outer try/catch as status: 'FAILED').
-- Purely additive: existing rows and every other enum value are unaffected.

-- AlterEnum
ALTER TYPE "RiskLevel" ADD VALUE 'GUARDED';
