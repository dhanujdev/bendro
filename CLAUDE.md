# Claude Conventions for this repo

## Commands
- Install: `pnpm i`
- Dev: `pnpm dev`
- Test: `pnpm test` (Vitest) · `pnpm e2e` (Playwright)
- Typecheck: `pnpm typecheck`
- Lint: `pnpm lint --fix`
- DB: `pnpm db:generate` · `pnpm db:migrate` · `pnpm db:seed`

## Before you finish a task, ALWAYS:
1. Run `pnpm typecheck && pnpm lint && pnpm test`
2. Ensure all new API routes have Zod input + output validation
3. Ensure all new service functions have a Vitest file
4. Update `src/types/` if you introduced a domain concept

## Conventions
- Never import from `@/db/*` outside `src/services/*` or `src/app/api/*`.
- Never put business logic in React components.
- Never bypass Zod validation on API boundaries.
- Use `useQuery` / `useMutation` (TanStack) for all server data. No raw `fetch` in components.
- Server components for data-heavy reads; client components only when interactive.

## Do not touch without asking
- `src/db/migrations/*` (generated)
- `src/app/api/webhooks/stripe/route.ts` (security-critical)
- `.env*` files

## Feature flags
All in `src/config/features.ts`. Gate WIP features behind flags, not branches.
