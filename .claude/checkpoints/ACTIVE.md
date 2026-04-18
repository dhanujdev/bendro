# Active Checkpoint

**Phase 15 — Vercel deploy + observability + CI e2e** (devops-lead).

Scope (subject to refinement):
- Vercel project wiring (preview + prod). Env-var matrix for
  `DATABASE_URL`, `AUTH_SECRET`, Google OAuth, Resend, Stripe,
  `STRIPE_PREMIUM_PRICE_ID`, `NEXT_PUBLIC_APP_URL`.
- Observability from the `trackEvent` stub: Sentry (server + client
  errors), PostHog (product analytics). Gate behind env flags so
  local/dev stays noise-free.
- GitHub Actions CI:
  - Existing: typecheck, unit tests, build.
  - New: `pnpm e2e` job running Playwright against a built Next
    server with `E2E_AUTH_BYPASS=1` + a seeded mock catalog.
  - Upload Playwright traces/videos on failure.
- Close out deferred e2e scaffolds from Phase 14:
  - Player e2e (`/player/demo`) — needs `getUserMedia` stub,
    WebGL/MediaPipe/VRM loader bypass via a test-only player
    fixture.
  - Onboarding e2e step bindings — multi-step form helper.
  - Signed-in Stripe checkout happy-path — needs Stripe test-mode
    keys wired into the CI env + a network intercept for the
    Checkout redirect URL.

**Already resolved in Phase 14 (was on this phase's list):**
- `pnpm build` Auth.js Drizzle-adapter "Unsupported database
  type" blocker. `src/lib/auth.ts` now conditionally attaches
  `DrizzleAdapter` only when `DATABASE_URL` is set; JWT fallback
  otherwise. Build succeeds cleanly.

**Defer to Phase 16:**
- Production monitoring alerts (PagerDuty / Slack hooks).
- Load / performance testing (k6 or similar).
- Backup + restore runbook for the Neon database.

## Tracked TODOs

- [ ] Create Vercel project + link to this repo.
- [ ] Env-var matrix documented in `docs/DEPLOY.md`.
- [ ] Sentry wiring (`@sentry/nextjs`) behind `SENTRY_DSN`.
- [ ] PostHog wiring (`posthog-js` + server) behind `POSTHOG_KEY`.
- [ ] `.github/workflows/ci.yml` — add e2e job with artifact upload.
- [ ] Player e2e fixture (getUserMedia + WebGL stubs).
- [ ] Onboarding e2e step bindings.
- [ ] Signed-in Stripe checkout happy-path (test-mode).
- [ ] Close-out: phase-15.md, CHANGELOG, AGENT_MEMORY, commit.

See `.claude/checkpoints/COMPLETED/phase-14.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
