# Phase 13 — Marketing Site & Pricing — CLOSED

**Lead:** frontend-lead
**Closed:** 2026-04-18
**Tests:** 307 passing (26 files); typecheck clean.

## Scope delivered

Making the public face of Bendro actually public — replacing the
always-redirects-to-/home root page with a real landing + pricing
surface and wiring the pricing CTA to the Phase 9 Stripe Checkout
endpoint.

### 1. Root routing

`src/app/page.tsx` (always-redirect) deleted. `src/app/(marketing)/page.tsx`
is now the canonical `/` handler and calls `auth()` — signed-in users
redirect to `/home`, signed-out visitors see the landing page inside the
marketing layout. Net effect: first-time visitors land on a marketing
surface rather than being punted into /signin.

### 2. `/pricing` wired to Stripe Checkout

`src/app/(marketing)/pricing/page.tsx` is an RSC that:

- Calls `auth()` and reads `getBillingPlans().premium_monthly.priceId`.
- Swaps the Free-plan CTA between `"Get started free"` → `/signin?callbackUrl=/home`
  and `"Back to app"` → `/home` based on session.
- Delegates the Premium CTA to a new client component
  `<StartCheckoutButton signedIn priceId label />`
  at `src/app/(marketing)/pricing/_components/start-checkout-button.tsx`.
- Adds a 7-question FAQ section (Free vs Premium, cancelation, refund,
  privacy, health-disclaimer, platform) using native `<details>` so it
  works without JavaScript.

`StartCheckoutButton` handles three cases:
- Signed-out → navigate to `/signin?callbackUrl=/pricing`.
- Signed-in + configured priceId → `fetch("POST /api/billing/checkout", { priceId })`,
  redirect `window.location.href` to the hosted URL, render amber inline
  error on failure.
- No priceId → disabled button + explanatory note.

Every press emits `trackEvent("upgrade.clicked", { source: "pricing", signedIn, hasPriceId })`.

### 3. Legal surface

- `src/app/(marketing)/legal/terms/page.tsx` — 8-section ToS covering
  acceptance, what-Bendro-is + medical disclaimer, accounts (13/16 age
  floor), subscriptions (14-day refund, period end), acceptable use,
  liability, change notice, contact.
- `src/app/(marketing)/legal/privacy/page.tsx` — 8-section Privacy
  Policy. Explicitly calls out on-device pose processing (no frames or
  landmarks leave the browser — matches `SECURITY_RULES.md`), the
  no-persist invariant for pre-existing-condition answers, GDPR/CCPA
  data rights, and that `upgrade.clicked` / `portal.opened` telemetry
  never contains PII.

Both pages carry `metadata: Metadata` for OG/title and a
`data-testid="legal-terms-page"` / `legal-privacy-page` hook.

### 4. SEO plumbing

- `src/app/sitemap.ts` — Next.js `MetadataRoute.Sitemap` function.
  Enumerates `/ /pricing /signin /legal/terms /legal/privacy` with
  per-route `priority` + `changeFrequency`. Base URL from
  `NEXT_PUBLIC_APP_URL`, trailing-slash-stripped, falls back to
  `https://bendro.app`.
- `src/app/robots.ts` — allows the marketing funnel, disallows
  `/api/ /home /library /player /account /settings /onboarding
  /medical-guidance`, advertises `{base}/sitemap.xml`.

### 5. Marketing shell polish

`src/app/(marketing)/layout.tsx`:

- Now an async RSC that calls `auth()`.
- Header CTA label toggles between `"Get started"` (→
  `/signin?callbackUrl=/home`) and `"Open app"` (→ `/home`) based on
  session. `data-testid="marketing-cta"`, `data-signed-in` attribute.
- Footer rewritten from a single-line copyright to a 4-column grid:
  brand tagline, Product (Pricing / Try a demo / Sign in-or-Open app),
  Legal (Terms / Privacy), Company (`hello@bendro.app` mailto).
  Closing line: the "Not medical advice" disclaimer required by
  `HEALTH_RULES.md §Mandatory Disclosures`.
- `data-testid="marketing-shell"`, `"marketing-header"`,
  `"marketing-footer"` hooks for Phase 14 Playwright.

### 6. Tests

- `tests/unit/seo-meta.test.ts` (new): 7 scenarios covering sitemap
  path enumeration, trailing-slash stripping, priority hierarchy,
  fallback host when `NEXT_PUBLIC_APP_URL` is unset; robots disallow
  list completeness, allow-list contents, sitemap URL advertisement.

Total: **+7 tests vs Phase 12 close (300 → 307)**.

### 7. BDD scaffolds

New directory `tests/features/marketing/`:
- `landing.feature` (4 scenarios: signed-out hero render, signed-in
  redirect-to-/home, header-CTA label contract, footer contents).
- `pricing.feature` (7 scenarios: free CTA signed-out vs signed-in,
  premium CTA label by auth state, checkout happy path with telemetry,
  checkout failure error surfacing, disabled state when priceId is
  unset, FAQ collapsibility).
- `legal.feature` (3 scenarios: terms render + cross-link, privacy
  on-device-pose callout, footer reachability).

Step bindings deferred to Phase 14 alongside all other Playwright wiring.

## Deferred / non-goals

- **OG image generation.** No `opengraph-image.tsx` yet — the root
  `layout.tsx` metadata is title + description only. Phase 15 can add
  a dynamic OG renderer or a static PNG.
- **Testimonials + logo soup.** Hero + features + pricing + FAQ is
  enough for a v1 launch; testimonials require real customers first.
- **Language alternates.** English only. Phase 20+.
- **Build-time blocker.** `pnpm build` fails during "Collecting page
  data" with an Auth.js Drizzle-adapter error — tracked separately as
  a Phase 15 deploy prereq. Dev-mode + typecheck + unit tests all pass;
  this is a `next build` static-analysis issue, not a runtime issue.

## Quality gates

- `pnpm test -- --run` → 307 / 307 passing (26 files).
- `pnpm typecheck` → clean (after clearing stale `.next` cache from the
  pre-existing root `page.tsx`).
- No schema changes.
- No new external deps.
- No new feature flags.
- `.env.example`: unchanged (`STRIPE_PREMIUM_PRICE_ID` already in place
  from Phase 9).
