# Changelog

All notable changes to Bendro are documented here.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- Creator OS framework port: `.claude/` agents, skills, hooks, rules, commands adapted to bendro stack (Next.js 16 / Drizzle / NextAuth / Stripe).
- `.claude/rules/HEALTH_RULES.md` — absolute prohibitions, mandatory disclaimers, pain-feedback flow, pre-existing-condition gating, camera/pose privacy.
- Foundational docs: `docs/AGENT_MEMORY.md`, `docs/BLOCKERS.md`, `docs/DECISIONS.md`, `docs/EXECUTION_LOG.md`, `docs/PHASES.md`, this `CHANGELOG.md`.
- `.claude/checkpoints/ACTIVE.md` + `docs/SESSION_HANDOFF.md` workflow for cross-session continuity.
- **Phase 1 — Test Coverage Baseline:** `@vitest/coverage-v8` reporter wired up with per-service threshold (≥85% lines for `src/services/**`) and global threshold (≥70% lines). `test:coverage` script added. Unit tests added for `billing`, `routines`, `sessions`, `personalization`, and `src/lib/data.ts` adapter (83 tests total, services at 95% line coverage).

### Changed
- Python hooks (`contract-guard.py`, `tdd-guard.py`, `pre-pr-gate.py`, `schema-changed.py`, `post-migration.py`) retargeted from `services/api`, `services/orchestrator`, `packages/*` layout to bendro's `src/app/api/**/route.ts`, `src/services/**`, `src/db/**`, Drizzle + pnpm conventions.

### Removed
- Creator-OS-only agents: `orchestration-lead`, `policy-lead`, `data-lead`.
- Creator-OS-only skills: `langgraph-review`, `policy-check`, `cost-tracking-check`, `workflow-adapter-check`, `evaluation-run`.
- `.claude/rules/LEGAL_RULES.md` (replaced by `HEALTH_RULES.md` — exercise/medical domain).

### Security
- Documented camera/pose privacy invariant in `SECURITY_RULES.md` and `HEALTH_RULES.md`: pose data never leaves the client.
- Added Stripe-only-in-`src/services/billing.ts` and MediaPipe-only-in-`src/lib/pose/*` architecture boundary checks to `pre-pr-gate.py`.

---

## Prior History (pre-framework port)

### 2026-04-17 and earlier
Scaffolded at https://github.com/dhanujdev/bendro — initial Next.js app, Drizzle schema, 6 API routes, camera/VRM integration, mock↔DB adapter. See `git log` for granular history.
