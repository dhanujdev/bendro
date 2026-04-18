---
name: db-migration-review
description: >
  Reviews any change to src/db/schema.ts. Checks that drizzle-kit generates a
  clean migration, every user-data table has userId, indexes exist on foreign
  keys, non-null columns added to existing tables have defaults, and the
  src/lib/data.ts mock adapter is updated to match the new schema shape.
---

# Skill: db-migration-review

Invoke whenever a change to `src/db/schema.ts` is proposed.
Invoke BEFORE generating the migration and again during PR review.

## Pre-Conditions
- The ADR covering the schema change has been read (or written via `create-adr`)
- `docs/architecture/er-diagram.md` has been read

## Naming Review
```
[ ] Table names: snake_case, plural (users, sessions, routines, routine_stretches)
[ ] Column names: camelCase in Drizzle TS, snake_case in SQL — Drizzle handles the map
[ ] Index names: Drizzle auto-names, but if custom: idx_{table}_{columns}
[ ] FK names: Drizzle auto-names, but if custom: {table}_{refTable}_fkey
[ ] Enum-like values: lowercase string unions in TS (e.g., 'free' | 'active' | 'canceled')
```

## User-Scoping (Security Requirement)
```
[ ] EVERY new table containing user-owned data has a userId column:
      userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' })
[ ] userId is NOT NULL (no default allowed for user data)
[ ] An index exists on userId for every user-scoped table:
      index('idx_{table}_user_id').on(t.userId)
[ ] FK to users.id is explicit, with an onDelete policy (cascade | set null | restrict)
```

User-scoped tables (MUST have userId): `sessions, favorites, streaks, user_preferences` (and any new user-owned table)
Catalog tables (no userId): `stretches, routines, routine_stretches`
Edge case: `routines` may have an optional `ownerId` for user-created routines — ownership check lives in the service layer.

bendro is a per-user product (no workspaces / no multi-tenancy). "userId from NextAuth session" is the single tenant axis.

## Performance Review
```
[ ] Index on every foreign key column
[ ] Index on every column used in WHERE in hot paths (routineId in sessions, etc.)
[ ] ORDER BY columns on hot lists are indexed (createdAt desc on sessions)
[ ] No full-table scans expected on tables > 10K rows without an index
[ ] Text search columns use a trigram / pg_trgm index if used in LIKE filters
```

## Data Safety Review
```
[ ] No non-nullable column added to an EXISTING table without a DEFAULT value
      (otherwise the migration fails against existing rows)
[ ] Sensitive fields flagged — never store plaintext passwords, tokens, Stripe secrets
[ ] Cascade behavior is explicit and intentional (onDelete: 'cascade' | 'set null' | 'restrict')
[ ] No PII columns beyond what the product needs (data minimization)
[ ] Soft-delete only where we need history — hard delete is fine for ephemeral records
```

## Migration File Review
```
[ ] Generate with: pnpm db:generate
[ ] Inspect the generated SQL in drizzle/ — it must match intent
[ ] Migration name is descriptive (rename the generated file if needed):
      0007_add_user_preferences.sql    # good
      0007_migration.sql                # bad
[ ] Migration file is committed in the SAME PR as the schema change
[ ] Rollback strategy is noted in the PR description (DROP TABLE or ALTER back)
[ ] Tested locally: `pnpm db:migrate` runs against a dev Neon branch without error
```

## Mock Adapter Sync (src/lib/data.ts)
```
[ ] src/lib/data.ts and src/lib/mock-data.ts updated to match the new schema shape
[ ] New table or column is represented in the in-memory mock dataset
[ ] Mock returns the same TS type as the Drizzle path — otherwise callers will break
[ ] If a new method is added, implement it in BOTH the mock path and the Drizzle path
[ ] src/db/seed.ts updated if the catalog gained a new seed row
```

## After the Review

### Generate and run the migration
```bash
pnpm db:generate            # creates SQL in drizzle/
pnpm db:migrate             # applies against the configured Neon / local Postgres
pnpm db:studio              # optional — inspect the resulting schema
```

### Update the ER diagram
```
[ ] docs/architecture/er-diagram.md updated to reflect schema changes
[ ] New tables shown with columns, types, and relationships
[ ] Invoke the architecture-diagram-update skill to verify diagrams render
```

### Update seed data (if catalog-facing)
```
[ ] src/db/seed.ts updated so `pnpm db:seed` produces a realistic dev dataset
[ ] Mock data in src/lib/mock-data.ts updated so local dev without DATABASE_URL still works
```

## Quick Checklist Summary (PR Review)
```
[ ] Table / column naming follows conventions
[ ] userId + index on every user-scoped table
[ ] Indexes on all FKs and hot-query columns
[ ] Rollback strategy documented in PR
[ ] No non-nullable-without-default on existing tables
[ ] src/lib/data.ts + src/lib/mock-data.ts match the new shape
[ ] ER diagram updated
[ ] Seed data updated where catalog tables changed
```
