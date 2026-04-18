# Bendro — Product Requirements Document

**Status:** v0.1 (Phase 0 baseline)
**Last updated:** 2026-04-18
**Owners:** planner (product), architect (technical)

---

## 1. Problem

Flexibility and mobility matter for everyone who sits, trains, or recovers
from injury — yet most people don't stretch consistently. Existing apps
either:

- Show static video tutorials without knowing whether you're doing the
  movement (no feedback loop), or
- Require a live coach (expensive, inaccessible), or
- Bury stretches inside a general fitness app where mobility is an
  afterthought.

The result: users start, drop off, and feel their bodies stiffen anyway.

## 2. Vision

Bendro is an AI-assisted flexibility copilot. A user opens the app, is
guided through a routine matched to their goals, and — if they opt in —
turns on their camera and sees a VRM avatar mirror their pose in real
time. The avatar is a silent form coach: when they're close to the target
pose, the avatar nods; when they're way off, the avatar prompts a cue. All
pose detection happens on device, so privacy is preserved by construction.

## 3. Target Audience (v1)

- **Primary:** adults 25–45, desk workers or recreational athletes who
  know they should stretch more but lack structure.
- **Secondary:** rehab-adjacent users (post-injury, not acute) who want
  general mobility guidance — with strong caveats that bendro is not a
  medical product.

## 4. Non-Goals (v1)

- Replacing a physical therapist. The product is explicit about this.
- Live 1:1 coaching (video calls with humans).
- Strength training, cardio, yoga flows.
- Apple Watch / wearable integration.
- Community features (forums, group challenges).
- Content moderation beyond the health-safety rules.

## 5. User Journeys (v1 Shipping)

### 5.1 New user, happy path

1. Lands on `/` (marketing) → clicks "Get started."
2. Signs up (email magic link or Google) — Phase 3.
3. Onboarding: picks 1–3 goals, selects focus & avoid body areas,
   answers pre-existing-condition questions — Phase 6.
4. Home screen shows a personalized recommended routine for today.
5. Opens the routine → reads overview → hits "Start."
6. Player page counts down, plays first stretch with timer + cues.
7. User opts in to camera → grants permission → avatar appears → pose
   mirroring starts.
8. Finishes routine → rates pain (0–10) per-stretch — Phase 8.
9. Streak counter increments.

### 5.2 Returning free user, happy path

1. Lands on `/home` → sees streak, last session, today's suggested routine.
2. Skims library → picks a different routine → does it.
3. Notices premium-only routines locked → upgrades → Stripe Checkout →
   returns to app with premium unlocked — Phase 9.

### 5.3 Safety-gated paths

- Pain rating ≥ 7 → Bendro suggests the user stop and consult a
  healthcare provider; deprioritizes similar routines next time.
- Onboarding flag: pregnant, recent surgery, or diagnosed condition →
  medical-clearance interstitial; catalog filters out deep-spine and
  high-load routines.

## 6. Functional Requirements (must ship in v1)

| # | Requirement | Phase |
|---|---|---|
| FR-01 | User can browse a public catalog of stretches and routines | Phase 0–2 |
| FR-02 | User can sign up and sign in with email (magic link) or Google | Phase 3 |
| FR-03 | User can complete an onboarding that captures goals, focus/avoid areas, and safety flags | Phase 6 |
| FR-04 | System recommends a routine based on the user's profile | Phase 6 |
| FR-05 | User can play a routine with timer, cues, and progress indicator | Phase 4 |
| FR-06 | User can enable the camera, see a live VRM avatar mirroring their pose, and disable at any time | Phase 4 |
| FR-07 | All pose detection is client-side; no landmarks or frames leave the device | Phase 0 (invariant) |
| FR-08 | User can rate pain (0–10) per session; pain ≥ 7 triggers safety guidance | Phase 8 + Phase 11 |
| FR-09 | System tracks streaks, session counts, minutes; displays on home | Phase 8 |
| FR-10 | User can filter the library by goal, body area, intensity | Phase 7 |
| FR-11 | User can favorite stretches and routines | Phase 7 |
| FR-12 | User can upgrade to premium via Stripe Checkout; premium routines unlock | Phase 9 |
| FR-13 | Stripe webhook updates subscription status idempotently with signature verification | Phase 9 |
| FR-14 | Every AI-generated or health-adjacent surface shows required disclaimer text | Phase 11 |
| FR-15 | App is installable as a PWA with offline catalog cache | Phase 10 |
| FR-16 | Production deploy on Vercel with preview deploys per PR | Phase 15 |

## 7. Non-Functional Requirements

| # | Requirement | Target |
|---|---|---|
| NFR-01 | Lighthouse Performance | ≥ 90 on home, library, pricing |
| NFR-02 | Lighthouse Accessibility | ≥ 95 on every page |
| NFR-03 | Lighthouse PWA | ≥ 90 after Phase 10 |
| NFR-04 | Initial JS bundle for `/home` | ≤ 200KB gzipped |
| NFR-05 | API p95 latency (cold) | ≤ 500ms |
| NFR-06 | Pose detection frame rate | ≥ 24fps on mid-tier mobile |
| NFR-07 | Error budget | 99.5% monthly uptime |
| NFR-08 | Test coverage — services | ≥ 85% |
| NFR-09 | Test coverage — global | ≥ 70% |
| NFR-10 | Zero high/critical findings on `pnpm audit` | always |
| NFR-11 | No secret material in committed code | always (detect-secrets) |
| NFR-12 | No raw user PII in logs | always (`pre-pr-gate.py` Gate 4) |

## 8. Technical Constraints

- **Next.js 16 App Router.** No Pages Router escape hatches.
- **Single deployable artifact on Vercel.** See ADR-0001.
- **Postgres only** (Neon). No Mongo, no Firestore.
- **Pose entirely client-side.** See ADR-0003.
- **Mock ↔ Drizzle adapter at `src/lib/data.ts`.** See ADR-0002.
- **Budget:** implementation by the 15-phase plan; effort target
  10–15 focused Claude sessions to launch v1.

## 9. Compliance & Safety

Owned by `.claude/rules/HEALTH_RULES.md`. Key invariants:

- No medical advice claims.
- No diagnosing injuries.
- Disclaimers at every prescribed surface.
- Pain feedback ≥ 7 triggers safety guidance.
- Pre-existing-condition flag gates high-risk routines.
- Camera data never leaves the device.

## 10. Metrics for v1 Success

| Metric | Target |
|---|---|
| First-session completion rate | ≥ 50% of sign-ups |
| Day-7 retention | ≥ 25% |
| Camera opt-in rate (of sessions started) | ≥ 30% |
| Pain ≥ 7 rate | tracked only — target is informational |
| Free → paid conversion (first 30 days) | ≥ 2% (early indicator only) |
| Page error rate | ≤ 0.5% |
| Webhook signature failures | 0 in prod |

## 11. Out of Scope (explicitly deferred)

- Social / community features
- AI-generated custom routines (Phase 16+, post-v1)
- Apple HealthKit / Google Fit integration (post-v1; see HEALTH_RULES.md guardrails)
- Server-side pose analysis (would require ADR + legal review)
- Multiple languages (English only for v1)
- Offline session logging with later sync (cache only; writes stay online in v1)

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| MediaPipe bundle bloats initial load | poor PWA / Lighthouse scores | defer to player route; service-worker cache (Phase 10/13) |
| VRM runtime breaks with Kalidokit bump | player unusable | single-file boundary (ADR-0003) — swap `vrm-driver.ts` |
| Stripe webhook race: signup + subscribe same tick | subscription state incorrect | idempotent handler keyed on `event.id` (Phase 9) |
| Health-safety copy drift | legal exposure | `src/lib/disclaimers.ts` single source of truth (Phase 11) |
| Mock ↔ DB divergence | test passes, prod breaks | integration suite runs both backends (Phase 5) |
| Next.js 16 API changes mid-build | refactor | AGENTS.md warning; read Next.js docs before each API usage |

## 13. Roadmap (after v1)

- **v1.1:** AI-generated routines via `src/services/ai/ai-client.ts`, scoped to routines-only, disclosed as AI-generated.
- **v1.2:** Offline session logging + sync on reconnect.
- **v1.3:** Apple HealthKit / Google Fit opt-in, read-only.
- **v2.0:** Server-side pose summaries (not frames), form-feedback voice cues.
