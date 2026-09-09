# VOJAS Copilot Instructions

## Operating rules

- Treat the current repository state as the source of truth. Do not rely on older milestone documents or narrative claims without fresh verification.
- Do not build new features before the existing app is bootable in a clean environment and the relevant verification steps have been run.
- Distinguish clearly between production data, demo data, test fixtures, estimated values, and unavailable observations.
- Use precise risk language: prefer `Potential anomaly`, `Potential discrepancy`, `Risk indicator`, or `Requires authorized verification` over certainty claims.
- Never claim a fix or completion without fresh evidence from the repo, local validation, or an explicit verification command.

## Project-specific facts

- This is a pnpm monorepo with apps in `apps/web` and `apps/api`, shared packages under `packages/*`, and database work under `packages/db`.
- Use Node.js 20+ and pnpm 9+ for all local development work.
- `pnpm db:generate` is a required prerequisite before Prisma-backed work or local boot verification.
- The project uses a real Prisma schema and a real backend/frontend split; keep changes focused on config, verification, documentation, and safe hardening unless a feature task explicitly asks for code changes.
- Treat seed files and demo fixtures as test data, not proof of production readiness.

## Quality gates before claiming success

1. Check the current repo state rather than historical notes.
2. Run the smallest relevant validation command.
3. Report the result with evidence, including any blockers.
4. If the environment is missing required tools, state that clearly and avoid claiming full runtime readiness.

## Safety and hygiene

- Keep secrets out of the repo. Never commit `.env` files or credentials.
- Prefer minimal, reversible changes.
- Keep documentation factual, evidence-based, and specific about remaining blockers.
- When live integrations are involved, explicitly identify whether the behavior is verified, stubbed, or awaiting credentials.
