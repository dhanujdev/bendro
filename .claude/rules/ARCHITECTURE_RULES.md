# Architecture Rules — Bendro

> Non-negotiable boundaries enforced by automated hooks and pr-reviewer agent.
> Any PR violating these is BLOCKED until resolved.

---

## Module Boundaries

| Rule | What Is Allowed | What Is NEVER Allowed |
|---|---|---|
| Drizzle / db access | Only inside `src/services/*` and `src/db/*` | Anywhere in `src/app/` (routes or components) |
| Business logic | Only in `src/services/*` | In route handlers (`src/app/api/**/route.ts`) or React components |
| Pose / MediaPipe imports | Only in `src/lib/pose/*` and `src/app/player/camera/_components/*` | Anywhere else |
| Stripe SDK | Only in `src/services/billing.ts` | Anywhere else |
| NextAuth server config | Only in `src/lib/auth.ts` (once added) | Duplicated elsewhere |
| Env variable reads | Only in `src/config/env.ts` | `process.env.X` scattered throughout |
| Mock ↔ DB toggle | Only in `src/lib/data.ts` | `if (process.env.DATABASE_URL)` in callers |
| `'use client'` boundary | Only when interactivity is required | Used reflexively — default to RSC |
| Route-group crossover | `(marketing)` and `(app)` are isolated | Layouts/components from one group imported into the other |

## Adapter Interfaces

Every external service or device API is behind a single-module boundary so it can be swapped:

```
src/lib/data.ts                  → mock ↔ Drizzle switch (data adapter)
src/lib/pose/vrm-driver.ts       → Kalidokit pose solver (swap to MediaPipe first-party when available)
src/services/billing.ts          → Stripe wrapper
src/services/ai/ai-client.ts     → OpenAI/Anthropic wrapper (when AI routine gen lands)
```

When adding a new external dependency: create the interface module first, then use it everywhere.

## Design Patterns (Non-Negotiable)

All database access → service in `src/services/*` calling Drizzle
All external services → single-module wrapper
Complex object creation → plain factory function `createX(...)` in the aggregate's service
Interchangeable algorithms → strategy module with a typed interface (example: pose solver)
All user-facing business rules (eligibility, gating) → service layer, not UI

## File Organization

```
src/app/
├── (marketing)/            Public pages — no auth required, no user data
├── (app)/                  Authenticated pages — NextAuth session required
├── onboarding/             First-run flow
├── player/                 Workout player (server shell + client camera)
└── api/                    REST handlers — thin, delegate to services

src/services/               Business logic (aggregate-per-file)
├── routines.ts
├── sessions.ts
├── streaks.ts
├── billing.ts
├── personalization.ts
└── ai/ (future)

src/db/                     Drizzle schema, client, seed
├── index.ts                Client (lazy Neon or mock)
├── schema.ts               Tables + relations
├── seed.ts                 Sample data
└── queries/ (future)       Grouped queries per aggregate when needed

src/lib/                    Cross-cutting utilities
├── data.ts                 Mock ↔ DB adapter (single switch)
├── utils.ts                cn() and other shadcn helpers
├── pose/                   Pose math + VRM driver
└── disclaimers.ts          (to be added) — health/safety copy

src/components/             Shared UI primitives (shadcn-generated + custom)
├── ui/                     shadcn primitives
└── {feature}/              Feature-grouped shared components

src/types/                  Shared domain types
src/config/                 Env + feature flags
```

## Dependency Rules

```
src/app/ → src/services/ (allowed)
src/app/ → src/lib/data.ts (allowed — via services, not directly for mutations)
src/app/ → src/db/ (NEVER — route handlers never touch Drizzle)
src/services/ → src/db/ (allowed)
src/services/ → src/lib/data.ts (allowed — data adapter is the standard)
src/services/ → src/app/ (NEVER — services cannot depend on routes/pages)
src/lib/pose/ → src/app/ (NEVER — pose lib is pure)
src/components/ → src/services/ (NEVER directly — fetch via API or receive as props)
```

## RSC vs Client Component Rules

- Default: Server Component (no `'use client'` at file top).
- Use `'use client'` only when the component needs: state, effects, browser APIs, event handlers tied to DOM, or third-party client-only libs (Three.js, MediaPipe).
- Client components imported into Server Components are allowed; the reverse is not.
- Co-locate client children under `_components/` within a feature route.

## API Route Rules

- Handlers live at `src/app/api/**/route.ts`.
- Every handler: parse body/params → Zod validate → call service → shape response.
- Status codes: `200` success, `201` create, `400` validation, `401` unauthenticated, `403` forbidden, `404` not found, `409` conflict, `429` rate-limited, `500` server error.
- Never return raw Drizzle rows — always map through a DTO in the service layer.
- Every mutating route has a matching OpenAPI entry in `docs/specs/openapi/v1/bendro.yaml`.
