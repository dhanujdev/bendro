# Active Checkpoint

**Phase 14 — E2E Coverage / Playwright step bindings** (qa-lead).

Scope (subject to refinement):
- Install Playwright + add `pnpm e2e` script.
- Shared fixture: dev server + stubbed `auth()` (env-flag or adapter
  swap) + seeded catalog via the mock adapter path.
- Wire step bindings for the existing Gherkin scenarios accumulated
  across Phases 2–13 (≈80 scenarios across ~15 .feature files).
- Primary smoke paths to lock in green:
  - `/` → signed-out landing → `/pricing` → checkout redirect
  - `/` → signed-in → `/home` → `/library` → `/player/{slug}`
  - free → premium paywall decoration → `/account?upgrade=1`
  - `/account` → `/api/billing/portal` → Stripe portal redirect
  - onboarding → safety-gate → library is default-gentle
  - camera-mode: unsupported / denied / no_camera overlays
- CI: add an e2e job to the workflow (can be Phase 15 if timing is
  tight, but prefer landing it in Phase 14).

**Defer to Phase 15:**
- Vercel deployment + env-var wiring.
- `pnpm build` Auth.js Drizzle-adapter "Unsupported database type" fix
  (blocks production build today). Likely related to `db` being read at
  build-time static analysis; needs a `db` lazy-init pattern or a
  build-time env guard.
- Observability (Sentry / PostHog wiring from the trackEvent stub).
- Production monitoring + alerting.

## Tracked TODOs

- [ ] `pnpm add -D @playwright/test`, `pnpm exec playwright install`.
- [ ] `playwright.config.ts` pointing at `http://localhost:3000`.
- [ ] Shared fixture for auth stubbing + seeded catalog.
- [ ] Step definitions for each feature file under `tests/features/**`.
- [ ] Close-out: phase-14.md, CHANGELOG, AGENT_MEMORY, commit.

See `.claude/checkpoints/COMPLETED/phase-13.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
