# Skill: db-migration-review

Invoke this skill whenever a **Prisma schema change is proposed**.
Invoke it BEFORE writing the migration and again during PR review.

## Pre-Conditions
- docs/specs/DOMAIN_MODEL.md has been read
- ADR-0005 (multi-tenancy isolation) has been read

## Naming Review
```
[ ] Table names: snake_case, plural (e.g., workflow_runs, audit_events)
[ ] Column names: snake_case (e.g., workspace_id, created_at)
[ ] Index names: idx_{table}_{columns} (e.g., idx_workflow_runs_workspace_id)
[ ] FK constraint names: fk_{table}_{referenced_table}
[ ] Enum names: SCREAMING_SNAKE_CASE values
```

## Multi-Tenancy (Security Requirement)
```
[ ] EVERY new table containing creator data has workspace_id column:
      workspace_id  String  @db.Uuid
      // Non-nullable, always included in queries
[ ] workspace_id has a non-null constraint (no default)
[ ] An index exists on workspace_id for every such table:
      @@index([workspace_id])
[ ] Foreign keys to workspaces table are explicit
```

Tenant-scoped tables (MUST have workspace_id):
projects, workflow_runs, workflow_step_runs, approval_requests, generated_artifacts,
validation_results, audit_events, token_usage_events, budget_snapshots

Platform-scoped tables (NO workspace_id):
workflow_definitions, tool_definitions, model_definitions, plan_tiers

## Performance Review
```
[ ] Indexes on all foreign key columns
[ ] Indexes on all columns used in WHERE clauses in hot paths
[ ] Columns used in ORDER BY have appropriate indexes
[ ] pgvector columns have HNSW index with documented dimensionality
[ ] No full-table scans expected on tables > 10K rows without index
```

## Data Safety Review
```
[ ] No non-nullable column added to existing table without a DEFAULT value
[ ] Audit/event tables are append-only — document constraint and repository enforcement
[ ] Sensitive data columns documented in docs/DATA_CLASSIFICATION.md
[ ] No plaintext storage of secrets, tokens, or passwords
[ ] Cascade delete behavior is explicit and intentional (OnDelete: Cascade vs Restrict)
```

## Migration File Review
```
[ ] Migration has a descriptive name (not "migration" or "update"):
      prisma migrate dev --name add_workspace_budget_snapshots
[ ] Migration file committed alongside schema changes (same PR)
[ ] Rollback strategy documented in PR description
[ ] Tested against the current dev database before committing
[ ] Migration does NOT modify audit_events or token_usage_events tables
      (these are append-only — schema changes must be additive only)
```

## After the Review

### Run the migration
```bash
# Generate and apply migration
npx prisma migrate dev --name {descriptive_name}

# Verify Prisma client regenerated
npx prisma generate

# Verify migration applied
psql postgresql://postgres:postgres@localhost:5432/creator_os \
  -c "SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 5;"
```

### Update ER Diagram
```
[ ] docs/architecture/er-diagram.md updated to reflect schema changes
[ ] New tables shown with all columns and relationships
[ ] Invoke architecture-diagram-update skill
```

### Update Domain Model Spec
```
[ ] docs/specs/DOMAIN_MODEL.md updated with new/changed entities
[ ] New entity invariants documented (e.g., "workspace_id is required and immutable")
```

## Quick Checklist Summary (PR Review)
```
[ ] Table/column naming follows conventions
[ ] workspace_id on all user-data tables
[ ] Indexes on all FK and hot-query columns
[ ] Rollback strategy documented
[ ] No non-nullable without DEFAULT on existing table
[ ] ER diagram updated
[ ] DATA_CLASSIFICATION.md updated if new sensitive fields
```
