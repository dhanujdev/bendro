# Setup

Fresh clones work with zero config: `pnpm install && pnpm dev` serves the app backed by the in-memory data in `src/lib/mock-data.ts`. The sections below are only needed when you want to hit a real database or enable paid features.

## Enabling real DB (Neon + Drizzle)

- Provision a free Postgres at <https://neon.tech> and copy the pooled connection string (needs `?sslmode=require`).
- Copy `.env.example` to `.env.local` and paste the string into `DATABASE_URL`.
- Run `pnpm db:generate` to emit SQL from `src/db/schema.ts`.
- Run `pnpm db:migrate` to apply migrations, then `pnpm db:seed` to load the sample stretches + routines.
- Restart `pnpm dev`. The API routes (`src/app/api/**`) transparently switch to Drizzle via `src/lib/data.ts`; unset `DATABASE_URL` any time to flip back to mocks.
