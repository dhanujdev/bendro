# Command: qa-sweep

**Usage:** `/qa-sweep`

Run a comprehensive QA sweep across the entire Creator OS codebase. This command validates builds, tests, API endpoints, feature file accuracy, and architecture invariants.

## What it does

Execute ALL of the following checks in order, reporting results as a structured table:

### 1. Unit Tests
```
python3 -m pytest tests/unit/python/ -v --tb=short --override-ini="addopts="
```
Report: total collected, passed, failed, errors. List every failure with file:line and 1-line reason.

### 2. Frontend Builds
Build both frontend apps and report success/failure with error details:
```
cd apps/web && pnpm build
cd apps/admin && pnpm build
```

### 3. API Health & Endpoint Smoke Test
If the API is running on localhost:8000:
- `GET /health` — verify 200
- `POST /api/v1/auth/signin` with seed credentials `owner@demo.example.com` / `password123`
- Using the returned JWT + workspaceId, hit every workspace-scoped endpoint:
  - `GET /api/v1/workspaces/{ws}/projects`
  - `GET /api/v1/workspaces/{ws}/workflow-runs`
  - `GET /api/v1/workspaces/{ws}/audit-events`
  - `GET /api/v1/workspaces/{ws}/cost-report`
  - `GET /api/v1/workspaces/{ws}/approvals`
  - `GET /api/v1/workspaces/{ws}/policy`
- Report HTTP status for each. Flag any non-200 response.

If API is not running, skip this section and note it.

### 4. BDD Feature File Validation
For every `.feature` file in `tests/features/`:
- **URL paths**: Check that any URL referenced matches the actual API routes from `/openapi.json` (workspace-scoped paths: `/api/v1/workspaces/{workspace_id}/...`)
- **HTTP methods**: Check that the method (GET/POST/PUT/DELETE/PATCH) matches what the API actually exposes
- **Error codes**: Cross-reference any `error code is "X"` step against the actual error codes in the corresponding route handler
- **Non-existent endpoints**: Flag any endpoint referenced in a feature file that doesn't exist in the API, unless the scenario is tagged `@wip`
- Report mismatches as a table.

### 5. Architecture Invariant Checks
Verify these rules from CLAUDE.md and .claude/rules/:
- No `langgraph` imports outside `services/orchestrator/`
- No direct `anthropic` SDK imports outside `anthropic_adapter.py`
- No `console.log` in non-test TypeScript files
- No raw SQL string concatenation (f-strings with SQL keywords)
- No hardcoded secrets patterns (`sk-ant-`, `sk-proj-`, `AKIA`)
- All repository files in `services/api/src/repositories/` reference `workspace_id`

### 6. Test-Implementation Sync Check
For every test file in `tests/unit/python/`:
- Verify that all imported functions/classes still exist in the source
- Flag any `ImportError` that would occur at collection time
- Check that mock field names match the actual code (e.g., camelCase vs snake_case for Prisma columns)

### 7. Next.js 15 Compatibility
Scan all `page.tsx` files in `apps/*/src/app/**/[*]/` for:
- Dynamic route params must use `Promise<>` type (Next.js 15 requirement)
- Must use `React.use(params)` or `useParams()` to unwrap

## Output Format

End with a summary table:

```
| Check                    | Result | Details                    |
|--------------------------|--------|----------------------------|
| Unit tests               | PASS   | 254/254                    |
| Web app build            | PASS   | 0 errors                   |
| Admin app build          | PASS   | 0 errors                   |
| API endpoints            | PASS   | 8/8 return 200             |
| Feature file accuracy    | WARN   | 3 path mismatches          |
| Architecture invariants  | PASS   | 0 violations               |
| Test-impl sync           | PASS   | 0 import errors            |
| Next.js 15 compat        | PASS   | All params use Promise<>   |
```

Then list all bugs found with severity (CRITICAL / HIGH / MEDIUM / LOW) and recommended fix.
