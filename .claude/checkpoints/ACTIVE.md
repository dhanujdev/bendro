# Active Checkpoint

**Phase 12 — Monetisation Polish / Paywall UX** (frontend-lead).

Scope (subject to refinement):
- Flip premium-routine gating from "hide entirely" (Phase 9) to
  "decorate + show upsell" on `/library` and routine cards.
- `/account` page: current plan, next-renewal date, cancel link.
  Stripe customer portal deep-link via `services/billing`.
- Upgrade CTAs: library locked-card click, player start screen when
  a premium routine is referenced in a shared link, `/home` side
  slot for free users.
- Telemetry/event hooks for upgrade clicks (no analytics stack yet —
  stub a `trackEvent(name, props)` wrapper so it can be wired later).

**No schema changes expected.** Stripe webhook ledger + subscription
status fields already exist from Phase 9. **No new external deps
expected.**

## Tracked TODOs

- [ ] Render premium badge on library + routine cards.
- [ ] Locked-card UX that routes to `/account?upgrade=1` (or similar).
- [ ] `src/app/(app)/account/page.tsx` with current plan + portal link.
- [ ] `GET /api/billing/portal-link` (or inline into `/account` RSC).
- [ ] Unit + integration tests.
- [ ] Close-out: phase-12.md, CHANGELOG, AGENT_MEMORY, commit.

See `.claude/checkpoints/COMPLETED/phase-11.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
