# Bendro Coding Standards

> Enforced by ESLint, TypeScript strict mode, and the `pre-write-check.py` hook.
> Violations that slip through code review become pr-reviewer findings.

---

## TypeScript

- **Strict mode on.** `tsconfig.json` sets `strict: true`. No opt-outs.
- **No `any`.** Use `unknown` + type narrowing, or proper generics.
- **No `@ts-ignore`, no `@ts-expect-error` without a linked issue.**
- **No non-null assertion (`!`)** unless the invariant is documented one line above.
- **Prefer `type` for data shapes**, `interface` when extending is likely.
- **Readonly by default** on props and public fields. Mutate only where ergonomics demand it.
- **`as const`** on literal objects used as lookup tables.

## Imports

Order (enforced by ESLint `import/order`):

1. Node builtins
2. External packages (`react`, `next`, `drizzle-orm`, etc.)
3. `@/` aliases
4. Relative (`./foo`, `../bar`)
5. Styles / assets

Always use the `@/` alias for cross-directory imports. No deep `../../..` chains.

## Next.js 16 Conventions

- **React Server Components are the default.** Only add `'use client'` when the file uses hooks, event handlers, browser APIs, or third-party client-only libraries.
- **Route handlers live at `src/app/api/<resource>/route.ts`.** Export named HTTP verb functions: `export async function GET(request, context) { ... }`.
- **Dynamic segments** use `[param]` folder naming. Access via the `context.params` prop (which is a Promise — **await it**; this is a Next.js 16 change).
- **Metadata** — export `metadata` from a page/layout. No `<Head>` tags.
- **`next/image`** for every raster image. Provide `alt`.
- **Server actions** (for mutations triggered from client components) live adjacent to the page that uses them, marked `'use server'` at the top of the file.
- **Before writing any Next.js code**, skim the relevant file in `node_modules/next/dist/docs/` — APIs change between major versions.

## React

- **Components:** PascalCase filenames (`RoutineCard.tsx`). One component per file.
- **Props:** declare a `type Props = {...}` above the component. No inline prop types for anything non-trivial.
- **No prop-drilling past 2 levels.** Hoist state or use Zustand.
- **Keys in lists:** use stable IDs. Never the array index unless the list is immutable and order is fixed.
- **Hooks follow the rules of hooks.** Extract reusable logic into `useX` hooks under `src/hooks/`.
- **Avoid unnecessary `useMemo`/`useCallback`.** Only when profiling shows a benefit.

## Styling

- **Tailwind utility classes** via the Prettier Tailwind plugin (auto-sorted on save).
- **shadcn/ui primitives** in `src/components/ui/`. Never edit generated files — regenerate and extend.
- **Design tokens** in `src/app/globals.css` CSS variables. No hard-coded hex colors outside that file.
- **Responsive:** mobile-first. `sm:`, `md:`, `lg:` progressively.

## Drizzle & Data Access

- **All Drizzle queries live in `src/services/*` or `src/db/*`.** Never in routes or components.
- **Callers use `src/lib/data.ts`**, not `db` directly.
- **Parameterization:** Drizzle handles it. If you ever need raw SQL, use `sql\`...\`` tagged templates — **never** `sql.raw` with user input.
- **Transactions:** use `db.transaction(async (tx) => { ... })` for multi-statement writes.
- **Migrations:** generate with `pnpm db:generate`, review the SQL, then `pnpm db:migrate`. Never hand-edit migration files.
- **Relations declared in `schema.ts`** so the `db.query.x.findFirst({ with: { ... } })` API works.

## Validation

- **Zod at every route boundary.** Parse request body, query, and path params with `z.object({...}).safeParse(...)`.
- **Return a 400** with the shape `{ error: { code: "VALIDATION_ERROR", details } }` on failure.
- **Never pass raw user input to Drizzle.** Validated + typed first.

## API Routes

Shape:

```ts
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession()
  if (!session) return Response.json({ error: { code: "UNAUTHENTICATED" } }, { status: 401 })

  const { id } = await params
  const parsed = BodySchema.safeParse(await request.json())
  if (!parsed.success) return Response.json({ error: { code: "VALIDATION_ERROR", details: parsed.error.flatten() } }, { status: 400 })

  const result = await sessionsService.create({ userId: session.user.id, routineId: id, ...parsed.data })
  return Response.json(result, { status: 201 })
}
```

Rules:
- Auth check first.
- Validate params + body.
- Delegate to service.
- Return JSON with correct status.
- Never do business logic inline in the handler.

## Error Handling

- **At system boundaries** (external APIs, DB): catch, log, rethrow a typed domain error.
- **Inside services:** throw. Let the route's top-level `try/catch` (or a route-level error helper) translate to an error envelope.
- **Never swallow errors silently.** No empty `catch` blocks.
- **Never over-handle.** Don't `try/catch` for errors that can't happen in the current call graph.

## Logging

- **No `console.log` in committed code** (except for CLI scripts under `scripts/` and tests).
- **Use the server logger wrapper** (added Phase 12) for server-side logs.
- **Never log** passwords, tokens, Stripe keys, session cookies, email addresses, or pose landmarks.
- **Always include** requestId / userId (when available) in log context.

## Testing

- **Vitest** for unit and integration tests.
- **Colocate small unit tests** next to their source: `foo.ts` → `foo.test.ts`.
- **Integration/API tests** live in `tests/integration/api/<resource>.test.ts`.
- **BDD features** in `tests/features/<domain>/<feature>.feature`; step defs in `tests/features/steps/`.
- **Coverage thresholds:** global ≥ 70%, services ≥ 85%. Enforced in CI.
- **Test behavior, not implementation.** Don't assert on internal intermediate state.

## File Size Limits

- Functions: ≤ 50 lines. Split when exceeded.
- Files: ≤ 300 lines (production code). Split into submodules.
- Components: ≤ 200 lines. Extract sub-components.
- Enforced by `pre-pr-gate.py` Gate 7.

## Documentation

- **JSDoc on every exported function, type, class, constant.** One-sentence summary; add `@param` / `@returns` when non-obvious.
- **Components:** JSDoc the component itself when its purpose isn't obvious from the name.
- **Inline comments:** explain *why*, not *what*. No comments for code that speaks for itself.
- **CHANGELOG.md** updated (under `[Unreleased]`) on every commit that changes behavior.

## Git Hygiene

- **Conventional commits.** See `CLAUDE.md` §14.
- **One logical change per commit.** Don't mix refactor + feature.
- **Never commit** `.env`, coverage reports, `tsbuildinfo`, or build artifacts.
- **Never push directly to `main`.** PRs only.
- **PR title = conventional commit.** Body explains the "why."

## Secrets & Config

- **All env reads** go through `src/config/env.ts`. No `process.env.FOO` scattered.
- **`src/config/env.ts`** validates presence + shape with Zod at module load. Fail fast on missing required env.
- **`.env.example`** must stay in sync with `src/config/env.ts`.
- **Never inline** API keys, DB URLs, or Stripe secrets — even in tests (use `.env.test`).

## Performance

- **Ship nothing that regresses Core Web Vitals.** Lighthouse budget check in CI (Phase 13+).
- **Lazy-load** pose / avatar libs behind the player route.
- **Avoid** large shared client components; prefer islands of interactivity.

---

*Last updated: Phase 0*
