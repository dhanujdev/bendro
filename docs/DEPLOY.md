# Deploy — Bendro on Vercel

> Target: Vercel preview (per-PR) + prod. Runtime is Node (not Edge).
> Database is Neon serverless Postgres with branching per preview.
> Scope: Phase 15 of the phase plan (see `docs/PHASES.md`).

---

## 1. Environment variable matrix

Every column below is either **required**, **optional**, or **local-only**.
Values live in Vercel Project Settings → Environment Variables. Never commit
real values — `.env.example` is the only template in the repo.

### Core app

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_APP_URL` | required | required | `https://<branch>.bendro.vercel.app` (preview), `https://bendro.app` (prod). Used for absolute links in emails + OpenGraph. |
| `NODE_ENV` | auto | auto | Vercel sets this. Do not override. |

### Database

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `DATABASE_URL` | required | required | Neon connection string with `sslmode=require`. Preview should point at a Neon branch, prod at the primary. |

If unset, the app boots against the in-memory mock adapter — safe for local
dev, **not safe for a deployed preview**. Vercel preview env must have
`DATABASE_URL` set or sessions + streaks reset on every deploy.

### Auth (Auth.js v5)

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `AUTH_SECRET` | required | required | 32+ bytes of random. Generate with `openssl rand -hex 32`. |
| `AUTH_URL` | required | required | Same as `NEXT_PUBLIC_APP_URL`. Auth.js uses this for callback URLs. |
| `AUTH_GOOGLE_ID` | optional | required | Google OAuth client id. Without it, Google sign-in is hidden. |
| `AUTH_GOOGLE_SECRET` | optional | required | Google OAuth client secret. |
| `AUTH_RESEND_KEY` | optional | required | Resend API key for magic-link emails. Without it, email sign-in is hidden. |
| `AUTH_EMAIL_FROM` | optional | required | e.g. `noreply@bendro.app`. Must be a verified Resend sender. |

Legacy env vars `NEXTAUTH_SECRET` + `NEXTAUTH_URL` are still honored as
fallbacks (see `src/lib/auth.ts`) but new deploys should use `AUTH_*`.

### Stripe billing (Phase 9)

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `STRIPE_SECRET_KEY` | required | required | `sk_test_…` for preview, `sk_live_…` for prod. |
| `STRIPE_WEBHOOK_SECRET` | required | required | Signing secret for `/api/webhooks/stripe`. Different value per environment. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | required | required | `pk_test_…` / `pk_live_…`. Client-safe. |
| `STRIPE_PREMIUM_PRICE_ID` | required | required | Monthly price id. Catalog-allowlisted in `src/config/billing.ts`. |
| `STRIPE_PREMIUM_ANNUAL_PRICE_ID` | optional | optional | Annual variant. If unset, annual CTA is hidden. |

### Observability (Phase 15)

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `SENTRY_DSN` | optional | required | Enables Sentry server + client error capture. No-op when unset. |
| `SENTRY_ORG` | optional | optional | Required only for source-map upload. |
| `SENTRY_PROJECT` | optional | optional | Required only for source-map upload. |
| `SENTRY_AUTH_TOKEN` | optional | optional | Required only for source-map upload (set as a **secret**, not exposed to client). |
| `NEXT_PUBLIC_POSTHOG_KEY` | optional | required | Client-side product analytics key. No-op when unset. |
| `NEXT_PUBLIC_POSTHOG_HOST` | optional | optional | Defaults to `https://app.posthog.com`. Set to EU host if needed. |

### E2E bypass (non-prod only)

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `E2E_AUTH_BYPASS` | **never** | **never** | Only the local `playwright.config.ts` webServer and CI e2e job set this. The bypass is double-gated (`NODE_ENV !== "production"` AND flag). |

### AI (optional)

| Name | Preview | Prod | Notes |
|---|---|---|---|
| `OPENAI_API_KEY` | optional | optional | Reserved for future AI-generated plans (`features.aiPlans`). |

---

## 2. Deploy checklist

1. **Create Vercel project** linked to the GitHub repo.
2. **Install integrations:**
   - Neon → provisions `DATABASE_URL` per branch.
   - Sentry → provisions `SENTRY_*` and wires source maps.
3. **Populate non-integration env vars** from the matrix above, per
   environment (Development / Preview / Production).
4. **Point DNS** for `bendro.app` at Vercel (prod only).
5. **Verify a preview deploy:**
   - Open a PR, wait for preview URL.
   - Landing page loads. `/pricing` shows the disabled Premium CTA if
     `STRIPE_PREMIUM_PRICE_ID` is missing (otherwise a live checkout).
   - Sign in via magic link (requires `AUTH_RESEND_KEY` +
     `AUTH_EMAIL_FROM`), confirm redirect to `/home`.
6. **Promote to prod** by merging the PR.

## 3. Database branching

- Every Vercel preview deploy gets a Neon branch via the Neon-Vercel
  integration. Drizzle migrations run at build time (`prebuild` hook —
  TODO Phase 15) against that branch.
- Prod runs migrations via a GitHub Actions deploy step before promotion.
- Manual migration runbook: `docs/DB_TOGGLE.md`.

## 4. Security notes

- CORS is Next.js-default (same-origin). Do NOT add wildcard.
- Stripe webhook is pinned to Node runtime + dynamic — see
  `src/app/api/webhooks/stripe/route.ts`.
- `E2E_AUTH_BYPASS` MUST NOT be set on any Vercel environment. The
  cookie seam is double-gated by `NODE_ENV`, but defense in depth.
- Rotate `AUTH_SECRET` + `STRIPE_WEBHOOK_SECRET` on suspected compromise.
  Revoking all sessions on `AUTH_SECRET` rotation is expected.

## 5. Rollback

- Vercel keeps every deploy. "Promote" a prior prod deploy via the
  Vercel dashboard. Drizzle migrations are forward-only, so rolling
  back application code does NOT roll back schema. Coordinate schema
  rollbacks via `docs/DB_TOGGLE.md`.
