# BDD Feature Files

Gherkin scenarios describing bendro's behavior in human-readable form.
These are the **authoritative source** for what the app should do — they are
version-controlled, reviewed in PRs, and kept in sync with the code.

## Layout

- `api/**.feature` — behavior of every `src/app/api/*/route.ts` endpoint.
- (future) `onboarding/**.feature`, `player/**.feature`, `billing/**.feature`.

## Current status (Phase 2)

Scaffolded only. The step definitions that bind these scenarios to test
runners are intentionally deferred. Reasons:

1. Vitest-based integration tests in `tests/integration/api/**` already
   cover the same assertions in TypeScript against the route handlers.
   The `.feature` files are the human contract; the Vitest files are the
   executable contract. Keeping both means we have a reviewable spec *and*
   a fast automated guard — without doubling the runtime cost of a full
   suite of BDD + unit + integration.
2. A full `behave`-style runner (Python) or `@cucumber/cucumber` binding
   would add a second test harness. We'll add exactly one (likely
   `@cucumber/cucumber` with Playwright-driven step definitions) when
   Phase 14 (E2E) lands.

## Convention

- One `Feature:` per domain surface (routines, sessions, progress, …).
- `Background:` for shared preconditions.
- Scenarios are **outcome-focused**, not implementation-focused.
- When a scenario covers an error envelope, it asserts:
  - the HTTP status
  - the `error.code` (see `ERROR_CODES` in `src/lib/http.ts`)
- When adding a new route, add/update the feature file **before** writing
  the handler (ADR-0014 style — contract & spec first).
