# Active Checkpoint

**Phase 16 — Vercel link + production hardening** (devops-lead).

Scope (subject to refinement):
- **Vercel project link (requires interactive owner login).**
  `vercel link` → bind the repo; `vercel env pull` to mirror env
  into `.env.local`; populate Preview + Production env via
  `docs/DEPLOY.md` matrix. Verify one preview deploy passes the
  signed-out marketing smoke (`/`, `/pricing`, `/legal/*`) and the
  signed-in happy-path with `E2E_AUTH_BYPASS` explicitly UNSET in
  prod. Wire Neon (DB) + Resend (magic-link) + Google OAuth +
  Stripe + Sentry + PostHog integrations via Vercel marketplace
  where available.
- **Deferred e2e scaffolds from Phase 14/15:**
  - **Player e2e (`/player/demo`).** Needs a Playwright fixture
    that stubs `navigator.mediaDevices.getUserMedia` (returning a
    synthetic `MediaStream`), short-circuits the MediaPipe Tasks
    Vision loader (`@mediapipe/tasks-vision`) with a module mock,
    and skips VRM/three-vrm init so WebGL isn't required. Smoke
    the ready → stretching → rest → complete transitions + the
    keyboard shortcut layer.
  - **Onboarding e2e step bindings.** Multi-step form helper
    (`stepAs({ goals, focus, avoid, conditions })`) that walks
    `/onboarding` intro → goals → focus → avoid → conditions and
    asserts the resulting `safetyFlag` via `/api/me`.
  - **Server-side PostHog call-sites.** `analytics-server.ts` is
    wired; add `captureServerEvent` to the subscription-updated
    webhook handler, the `/api/billing/portal` route, and any
    moderation-reject code paths for server-visibility into
    funnel events that never hit the client.
- **Production monitoring alerts.** Sentry → PagerDuty or Slack
  webhook for P1 errors (unhandled exceptions on server routes,
  Stripe webhook 500s, Auth.js sign-in failures). Uptime monitor
  on `/api/health` (or equivalent synthetic endpoint) via
  BetterStack / Uptime Kuma / Vercel checks.
- **Load + performance testing.** First pass against the two
  highest-traffic paths: `/pricing` → `POST /api/billing/checkout`
  and `/home` (RSC with `/api/progress` underneath). k6 or
  artillery script; target 100 concurrent users baseline; log p50
  / p95 / p99 + error rate + Vercel function cold-start.
- **Backup + restore runbook for Neon.** Document the branching
  strategy (Neon auto-branches preview envs; prod backups retained
  7 days by default). Add `docs/RUNBOOKS/neon-restore.md` covering
  point-in-time restore, schema-drift remediation, and the
  Drizzle-migrations replay sequence.

## Tracked TODOs

- [ ] `vercel link` + `vercel env pull` (requires owner action).
- [ ] Verify preview deploy green end-to-end.
- [ ] Player e2e fixture (getUserMedia + MediaPipe + WebGL stubs).
- [ ] Onboarding e2e step bindings.
- [ ] Server-side PostHog call-site wiring.
- [ ] Sentry alert routing → Slack / PagerDuty.
- [ ] Uptime monitor for `/api/health`.
- [ ] Load test script + baseline report.
- [ ] Neon backup/restore runbook.
- [ ] Close-out: phase-16.md, CHANGELOG, AGENT_MEMORY, commit.

See `.claude/checkpoints/COMPLETED/phase-15.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
