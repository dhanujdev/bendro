# Active Checkpoint

**Phase 13 — Marketing Site & Pricing** (frontend-lead).

Scope (subject to refinement):
- Landing page (`/`) — hero, value prop, 3-4 feature blocks, testimonial
  placeholder, CTA to /signin and /pricing. Replace the current
  auto-redirect with a real marketing surface.
- `/pricing` page — plan comparison (Free vs Premium), FAQ section,
  Stripe Checkout CTA wired to `POST /api/billing/checkout` with the
  premium priceId from env.
- Public shell: `src/app/(marketing)/layout.tsx` with header + footer.
  Footer with legal links (Terms, Privacy — stub pages if missing).
- SEO: metadata, OG image, sitemap.ts, robots.ts.
- No new external deps expected. No schema changes expected.

**Defer to Phase 14:** step-binding Playwright across the marketing
funnel. We ship the static surface + Checkout wiring in Phase 13 and
wire E2E in Phase 14.

## Tracked TODOs

- [ ] Landing page `/` with hero + features + CTA.
- [ ] `/pricing` with plan comparison + Checkout button.
- [ ] `(marketing)` layout with public nav + footer.
- [ ] SEO: `app/sitemap.ts`, `app/robots.ts`, OG image.
- [ ] Terms + Privacy stub pages (`/legal/terms`, `/legal/privacy`).
- [ ] Unit + integration tests (Checkout CTA → Stripe URL).
- [ ] Close-out: phase-13.md, CHANGELOG, AGENT_MEMORY, commit.

See `.claude/checkpoints/COMPLETED/phase-12.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
