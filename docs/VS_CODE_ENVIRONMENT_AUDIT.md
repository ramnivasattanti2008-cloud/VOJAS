# VS Code Environment Audit

Date: 2026-09-08
Scope: Current workspace, toolchain, and engineering environment health for VOJAS.

## Executive summary

The project already has a valid Node + pnpm monorepo structure and a real repository. The current missing piece is not major app code, but an adequately configured VS Code environment and project-level guidance for safe engineering. The workspace was missing:

- a workspace-level `.vscode` configuration
- a project Copilot instruction file
- task and debug profiles for the monorepo
- a defined recommendation list for essential dev tooling
- a secure baseline for local environment usage

This is a moderate-risk configuration gap rather than a feature issue. It does not indicate a broken application architecture; it indicates the engineering environment was not yet fully hardened for actual usage.

## Verified environment facts

### Toolchain status

- Node: detected as `v24.19.0`
- pnpm: detected as `9.12.0`
- Git: detected as `2.55.0.windows.3`
- Git remote: valid GitHub repository configured
- Docker: not installed in the current local environment
- psql: not installed in the current local environment

### Repository status

- The repo is a pnpm monorepo, with `apps/web`, `apps/api`, `packages/*`, and a root `package.json`.
- The root workspace uses Node 20+ and pnpm 9+.
- Prisma generation is supported in the workspace and was verified earlier.
- The repo currently contains a real `.env` and `.env.example`, with `.gitignore` excluding `.env` files.
- The repo already includes `.claude/settings.local.json`, but there was no workspace-level VS Code configuration or project instruction file.

## Risks observed

### 1. Missing local database tooling

Docker and `psql` are absent in the current development environment. That means local Postgres verification cannot be performed by the current machine without installing Docker or a Postgres client, or by using an alternative managed environment.

Impact: it reduces certainty around database-backed development and runtime validation.

### 2. Incomplete environment hardening for VS Code

The workspace lacked a project-level baseline for:

- TypeScript workspace settings
- UI tasks for dev / Prisma / typecheck / tests
- debug configuration for API and web apps
- curated extension recommendations
- project instructions for Copilot

Impact: the team is more likely to miss setup steps, run the wrong commands, or rely on unverified behavior.

### 3. No enforced engineering rules in repo context

Without repo instructions, the AI can drift toward broad feature-building or historic narrative assumptions instead of evidence-based verification.

Impact: this creates a risk of “hallucinated completion” or ungrounded feature work.

## What is now in place

The workspace now includes a minimal but useful engineering baseline:

- `.github/copilot-instructions.md` — repository rules for evidence-based work and risk-aware language
- `.vscode/settings.json` — TypeScript, editor, search, and workspace behavior settings
- `.vscode/extensions.json` — recommended toolchain extensions for this repo
- `.vscode/tasks.json` — common development tasks
- `.vscode/launch.json` — debug configurations for API and web apps

## Recommended next actions

1. Install Docker Desktop or an equivalent Postgres-enabled local stack if DB validation is required on this machine.
2. Ensure the project uses the workspace-selected Node version and pnpm install from the root.
3. Create or restore `.env` from `.env.example` with the correct local values before running full stack app startup.
4. Resolve the stale port 3000 conflict before treating the web app as healthy.
5. Keep `pnpm db:generate` as the first required step before Prisma-dependent validation.
6. Use the project Copilot instructions as the default guardrail for future status reports and coding work.

## Final assessment

Status: YELLOW

Reason: the repo is materially present and the engineering environment is now better configured, but local database tooling and the full app boot verification remain unproven on the current machine.

This is not a red failure; it is a realistic environment gap that can be addressed without rewriting the application itself.
