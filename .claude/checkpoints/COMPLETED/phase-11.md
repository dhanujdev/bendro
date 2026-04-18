# Phase 11 — Health Safety & Disclaimers — CLOSED

**Lead:** security-lead (Opus)
**Closed:** 2026-04-18
**Tests:** 286 passing (23 files); typecheck clean.

## Scope delivered

Grounding every health-adjacent surface on `.claude/rules/HEALTH_RULES.md`.

### 1. Single source of truth — `src/lib/disclaimers.ts`

Every health disclaimer now flows through one module:

- `DisclaimerSurface` union: `onboardingIntro`, `routineStart`,
  `painPromptLow`, `painPromptMedium`, `painPromptHigh`, `safetyGate`,
  `aiGeneratedCard`, `marketingPainRelief`.
- `DISCLAIMERS: Record<DisclaimerSurface, Disclaimer>` with copy that
  matches HEALTH_RULES verbatim ("Consult a qualified healthcare
  provider…", "We'll default your library to gentle routines", …).
- `painPromptForRating(0–10) → Disclaimer` shares thresholds with
  `safety.ts::classifyPainRating` (≥7 high, ≥4 medium).
- `painPromptHigh` carries a CTA `{ label: "Find medical guidance",
  href: "/medical-guidance" }`.

Inline health copy anywhere outside `disclaimers.ts` is now a
rule violation that `pr-reviewer` flags.

### 2. Pain-feedback thresholds — `src/services/safety.ts`

`PAIN_MEDIUM_THRESHOLD = 4`, `PAIN_HIGH_THRESHOLD = 7`.
`classifyPainRating(r)` returns `"low" | "medium" | "high"` with the
same cut-offs as the UI prompt copy.
`sessionHadHighPain(painFeedback)` → boolean for the recommender.

### 3. `<DisclaimerBanner />` wiring

- Component lives at `src/components/disclaimer-banner.tsx`.
- Severity-driven Tailwind variant (neutral / caution / warn), optional
  CTA link, `data-testid="disclaimer-{id}"` + `data-severity` for tests.
- Rendered on:
  - `src/app/onboarding/page.tsx` — `onboardingIntro` (intro step) and
    `safetyGate` (pre-existing-condition step).
  - `src/app/player/_components/player-client.tsx` — `routineStart` on
    the ready screen before the Start button.
  - `src/app/medical-guidance/page.tsx` — `painPromptHigh` (new
    destination page so the CTA never 404s).

### 4. Pre-existing-condition enforcement (Phase 6 → Phase 11 tightening)

`src/services/personalization.ts::filterRoutineCatalog`:
- Phase 6 behaviour: `safetyFlag && level === "deep"` → drop.
- Phase 11 behaviour: `safetyFlag && level !== "gentle"` → drop.
  Matches the safety-gate copy promise ("We'll default your library to
  gentle routines") literally. Both `moderate` and `deep` disappear
  for flagged users.

### 5. Pain-feedback ≥ 7 deprioritisation

`src/services/personalization.ts`:
- New `routinesWithHighPainHistory(sessions): Set<string>` — pure,
  uses `sessionHadHighPain` under the hood.
- `suggestRoutinesForUser(userId, goals, focusAreas, sessionHistory?)`
  accepts an optional history. Routines with prior high-pain ratings
  are sorted to the back of the result list (soft penalty — still
  reachable in the library, per HEALTH_RULES wording).

### 6. `/medical-guidance` stub page

New App Router page at `src/app/medical-guidance/page.tsx`. Renders
`<DisclaimerBanner surface="painPromptHigh" />`, lists the kinds of
clinicians to seek out, and links back to home. Exists so the CTA
in `painPromptHigh` resolves to a real route rather than a 404.

### 7. Tests

- `tests/unit/disclaimers.test.ts` — 12 cases: registry coverage,
  HEALTH_RULES copy match, CTA presence, `painPromptForRating` tiers.
- `tests/unit/safety.test.ts` — 9 cases: classifier tiers + defensive
  behaviour (non-finite, negative, null/empty painFeedback).
- `tests/unit/personalization.test.ts` — 2 tests updated for the
  safetyFlag tightening; 5 new tests for pain-history deprioritisation
  and `routinesWithHighPainHistory`.

Total: **+26 tests vs Phase 10 close (259 → 286)**.

## Deferred / non-goals

- **Post-session pain-capture UI.** Schema supports `painFeedback` on
  every session and the service layer wires it through, but the
  completion screen does not yet collect it. Deferred to a future
  phase; the deprioritisation plumbing is in place so the UI can be
  added without service changes.
- **Per-stretch caution tags in the DB.** Still using the coarse
  goal→body-area mapping as a proxy for avoidance. A real
  `routines.cautions` column is a Phase 14+ concern.
- **BDD step bindings for `/medical-guidance`.** Playwright is not
  wired yet; this is a Phase 14 task.

## Quality gates

- `pnpm test -- --run` → 286 / 286 passing.
- `pnpm typecheck` → clean.
- Grep audit: only `disclaimers.ts`, `disclaimer-banner.tsx` (JSDoc
  quote), `medical-guidance/page.tsx` (dedicated page prose), and
  `mock-data.ts` (stretch-level caution seed data) contain health
  copy. No inline drift.

## Known deferrals carried forward (not from Phase 11)

Pre-existing lint noise inherited from earlier phases:
- 3 parser errors under `.claude/context/templates/` (tooling template
  not built by Next).
- 1 setState-in-effect warning at
  `camera-pose-client.tsx:96` (tracked in Phase 4 closeout).
- 7 `any` errors across `tests/unit/data-adapter.test.ts` and
  `tests/unit/personalization.test.ts` (seeded Phase 1/6).
  Not addressed under Phase 11 scope-discipline rules.
