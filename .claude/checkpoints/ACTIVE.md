# Active Checkpoint

**Phase 11 — Health Safety & Disclaimers** (security-lead, Opus).

Scope per `docs/PHASES.md` + `.claude/rules/HEALTH_RULES.md`:
- `src/lib/disclaimers.ts` — single source of truth for every user-
  facing disclaimer string (stretching risks, not medical advice,
  pre-existing conditions, pregnancy).
- Render disclaimers on: onboarding, routine start, pain-feedback
  prompt, AI-generated cards (forward-compat — no AI cards yet).
- Pain-feedback ≥ 7 flow: surface medical-guidance CTA and mark the
  routine to deprioritise in personalization for this user.
- Pre-existing-condition safety-flag enforcement throughout
  `src/services/personalization.ts`.
- Audit repo for user-facing text that contradicts disclaimers.

**No schema changes expected.** `preExistingConditions` column already
exists from Phase 6. **No new external deps expected.**

## Tracked TODOs

- [ ] Read `.claude/rules/HEALTH_RULES.md` end-to-end and enumerate
      every disclaimer it mandates.
- [ ] Write `src/lib/disclaimers.ts` with named exports per disclaimer
      (strings + optional link targets). All copy goes through this
      module — no inline health copy elsewhere.
- [ ] Render `<DisclaimerBanner />` (or equivalent) on `/home`,
      routine-start (`/player/[id]` ready screen), and the pain
      feedback prompt.
- [ ] Pain-feedback ≥ 7: personalization service deprioritises that
      routine (lower sort weight, not hard-remove), and UI surfaces
      a medical-guidance callout.
- [ ] Enforce pre-existing-condition flags in `filterRoutineCatalog`
      (e.g., back condition → skip routines with `bodyAreas: ["back"]`
      unless marked safe).
- [ ] Grep audit: every instance of user-facing health-adjacent copy
      pulls from `disclaimers.ts`.
- [ ] Unit tests for `disclaimers.ts` and the new personalization
      filters.
- [ ] Phase-11 checkpoint archive + CHANGELOG + git commit.

See `.claude/checkpoints/COMPLETED/phase-10.md` for the archived prior phase.
See `docs/PHASES.md` for the full phase plan.
