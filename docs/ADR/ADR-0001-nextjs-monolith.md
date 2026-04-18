# ADR-0001: Next.js 16 Full-Stack Monolith (no Microservices)

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** architect, planner
**Context for:** every subsequent architecture decision

---

## Context

Bendro is an AI-assisted flexibility/stretching copilot: public marketing
site, authenticated app with personalization, camera + pose + VRM avatar
player, REST API backing all UI, Stripe billing, Neon Postgres storage.

The team is small (effectively one developer + Claude agents). The target is
a shippable v1 on Vercel within a few focused sessions. Known constraints:

- Single deploy target (Vercel) with first-class Next.js support.
- Neon offers zero-infra serverless Postgres + branching per preview env.
- Creator OS (the sibling reference project) uses a multi-service layout
  (`services/api`, `services/orchestrator`, `packages/*`). Tempting to copy.
- Bendro has *no* long-running workflows, *no* agent orchestration, *no*
  multi-tenant admin plane. The things that justify a microservice split in
  Creator OS do not exist here.

## Decision

Bendro is a **single Next.js 16 App Router monolith**. One deployable
artifact. One source tree. One build.

- API lives as Next.js Route Handlers under `src/app/api/**/route.ts`.
- Business logic lives under `src/services/*.ts`.
- Data access lives under `src/db/*` behind `src/lib/data.ts`.
- UI lives under `src/app/(marketing)/`, `src/app/(app)/`, `src/app/onboarding/`, `src/app/player/`.
- Public packages, separate services, and inter-service HTTP calls are
  **not introduced** until there is concrete pressure to split.

## Consequences

**Positive:**
- Fewest moving parts → fastest path to shippable v1.
- Vercel handles deployment, secrets, preview envs natively.
- RSC lets most fetching happen server-side without a separate API tier
  round-trip when the UI is the only consumer.
- Single TypeScript config, single ESLint config, single testing setup.

**Negative:**
- If we later need a long-running pose analysis worker, or a separate
  admin control plane, we will need to extract services. This is a real
  future cost, but we accept it because:
  - The monolith can still be split horizontally by extracting a module
    into a separate package when (not if) the need materializes.
  - Premature service boundaries are far costlier than lazy extraction.

**Neutral:**
- The Creator OS framework still applies (BDD/TDD, contract-first, ADRs,
  action logs, PR gates). We keep the **process**, drop the **topology**.

## Enforcement

- `.claude/rules/ARCHITECTURE_RULES.md` forbids introducing a second
  service without a superseding ADR.
- `pr-reviewer` blocks any PR that adds a sibling deployable artifact.
- `devops-lead` is the sole agent who can modify Vercel/infra config.

## Revisit Triggers

Reopen this decision if any of the following occur:

1. A workload requires background processing > 30s per invocation (Vercel
   function ceiling) → extract a separate worker.
2. We integrate server-side pose analysis → ADR for a separate inference
   service (which also trips a privacy/HIPAA review per `HEALTH_RULES.md`).
3. A second product surface (e.g., an admin portal) shares no code with
   the user app → extract `apps/admin` into its own package.

---

## References

- `CLAUDE.md` §1, §5
- `.claude/rules/ARCHITECTURE_RULES.md`
- `docs/PHASES.md`
