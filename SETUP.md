# Setup

Fresh clones work with zero config: `pnpm install && pnpm dev` serves the app backed by the in-memory data in `src/lib/mock-data.ts`. The sections below are only needed when you want to hit a real database or work on the camera/avatar layer.

## Enabling real DB (Neon + Drizzle)

- Provision a free Postgres at <https://neon.tech> and copy the pooled connection string (needs `?sslmode=require`).
- Copy `.env.example` to `.env.local` and paste the string into `DATABASE_URL`.
- Run `pnpm db:generate` to emit SQL from `src/db/schema.ts`.
- Run `pnpm db:migrate` to apply migrations, then `pnpm db:seed` to load the sample stretches + routines.
- Restart `pnpm dev`. The API routes (`src/app/api/**`) transparently switch to Drizzle via `src/lib/data.ts`; unset `DATABASE_URL` any time to flip back to mocks.

> **Drizzle relations** are declared at the bottom of `src/db/schema.ts`. The relational query API (`db.query.X.findFirst({ with: {…} })`) used by `src/services/routines.ts` and `src/services/sessions.ts` needs these — don't delete them.

## Camera / pose / avatar

- `/player/camera` has two modes: **Stick figure** (2D canvas overlay) and **Avatar** (3D VRM rig).
- The VRM avatar loads from `public/avatars/default.vrm` (MIT-licensed sample from [pixiv/three-vrm](https://github.com/pixiv/three-vrm), bundled for offline use).
- Pose solving lives in `src/lib/pose/vrm-driver.ts` behind a single module boundary. When Google ships a first-party MediaPipe avatar solver, swap the `import * as Kalidokit` line and rewrite `solvePose()` — nothing else needs to change.
- Swap to a different VRM by replacing `public/avatars/default.vrm` (keep the filename) or by changing `DEFAULT_VRM_URL` in `src/app/player/camera/_components/avatar-view.tsx`.

## Useful commands

```
pnpm dev           # Next.js dev server on :3000
pnpm typecheck     # tsc --noEmit
pnpm lint          # ESLint
pnpm test          # vitest (streak logic unit tests)
pnpm build         # production build

pnpm db:generate   # emit SQL migrations
pnpm db:migrate    # apply migrations to DATABASE_URL
pnpm db:seed       # load sample data
pnpm db:studio     # open Drizzle Studio against DATABASE_URL
```
