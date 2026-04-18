---
name: enterprise-standards-check
description: >
  Comprehensive enterprise standards gate. Run before any PR is submitted.
  Enforces: naming conventions, design patterns, documentation completeness,
  security invariants, multi-tenancy, test coverage, and code size limits.
  Outputs a structured PASS/FAIL checklist with file:line references.
---

# Skill: enterprise-standards-check

Run this skill before submitting ANY pull request. It is a complete gate that
covers all enterprise engineering standards defined in docs/STANDARDS.md,
CLAUDE.md, and the ADR set.

## Command

```bash
# Run the full standards check
make standards-check
```

Or manually run each section below.

---

## Section 1 — Naming Conventions

### Python
```bash
# Check for non-snake_case function/variable names (should be zero violations)
ruff check services/ packages/ --select N801,N802,N803,N806 --format text

# Check for missing Google-style docstrings on public functions
ruff check services/ packages/ --select D100,D101,D102,D103 --format text
```

Expected: **0 violations**

Rules:
- [ ] Python files: `snake_case.py`
- [ ] Python classes: `PascalCase`
- [ ] Pydantic models: `XxxRequest`, `XxxResponse`, `XxxData`
- [ ] LangGraph states: `XxxState`
- [ ] LangGraph nodes: verb-phrase `snake_case` (e.g., `ingest_goal`, `validate_output`)
- [ ] Repository classes: `XxxRepository`
- [ ] All public functions have Google-style docstrings
- [ ] All public classes have docstrings

### TypeScript
```bash
# ESLint naming rules
pnpm --filter "apps/*" --filter "packages/*" lint

# Check for any type
grep -rn ": any" apps/ packages/ services/api/src/ --include="*.ts" --include="*.tsx" | grep -v ".d.ts" | grep -v "test" | grep -v "spec"
```

Expected: **0 `any` types** in non-test files

Rules:
- [ ] TypeScript files: `kebab-case.ts`
- [ ] React components: `PascalCase.tsx`
- [ ] Zod schemas: `XxxSchema`
- [ ] tRPC routers: `XxxRouter`
- [ ] All public exports have JSDoc comments
- [ ] Explicit return types on all non-trivial functions

---

## Section 2 — Code Size Limits

```bash
# Find Python functions over 50 lines
python3 -c "
import ast, sys
from pathlib import Path
for f in Path('services').rglob('*.py'):
    try:
        tree = ast.parse(f.read_text())
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                end = getattr(node, 'end_lineno', node.lineno + 50)
                if end - node.lineno > 50:
                    print(f'{f}:{node.lineno} — function \"{node.name}\" is {end - node.lineno} lines (limit: 50)')
    except:
        pass
"

# Find files over 300 lines
find services/ packages/ apps/ -name "*.py" -o -name "*.ts" -o -name "*.tsx" | xargs wc -l 2>/dev/null | awk '$1 > 300 {print $0}' | sort -rn | head -20
```

Expected: **0 functions over 50 lines**, **0 files over 300 lines**

---

## Section 3 — Design Pattern Enforcement

### Repository Pattern
```bash
# Ensure no raw ORM/SQL calls outside repositories/
grep -rn "db\.execute\|AsyncSession\|select(\|Session(" services/api/src/routes/ services/api/src/services/ --include="*.py" | grep -v "test" | grep -v "# OK:"
```

Expected: **0 raw DB calls in routes or services** (only allowed in `repositories/`)

```bash
# Check all repository classes extend or follow the pattern
grep -rn "class.*Repository" services/ packages/ --include="*.py"
```

- [ ] Every DB access class is named `XxxRepository`
- [ ] Repository classes use `sqlalchemy.text()` with named parameters only
- [ ] No string concatenation in SQL queries

### Adapter Pattern
```bash
# Check all external service adapters implement a Protocol
grep -rn "class.*Adapter" services/orchestrator/src/providers/ --include="*.py"
grep -rn "Protocol" services/orchestrator/src/providers/interfaces.py
```

- [ ] `AnthropicAdapter` implements `LlmAdapter` Protocol
- [ ] `MinioAdapter` (Phase 4+) implements `StorageAdapter` Protocol
- [ ] No direct `anthropic.` SDK calls outside `anthropic_adapter.py`
- [ ] No direct `openai.` SDK calls outside `openai_adapter.py` (Phase 15+)

### Architecture Invariants
```bash
# LangGraph only in orchestrator
grep -rn "langgraph\|StateGraph\|LangGraph" services/api/ apps/ packages/ --include="*.py" --include="*.ts"

# Policy engine only in packages/policy-engine
grep -rn "PolicyResolver\|policy_engine" services/api/src/routes/ services/orchestrator/src/nodes/ --include="*.py" | grep -v "from packages"

# Audit events only via observability package
grep -rn "audit_events.*INSERT\|INSERT.*audit_events" services/ --include="*.py" | grep -v "AuditEventRepository\|test_"
```

Expected for all three: **0 violations**

---

## Section 4 — Security Invariants

```bash
# workspace_id filter on all user-data queries
python3 scripts/check_workspace_id.py  # see scripts/ for implementation

# No hardcoded secrets
detect-secrets scan --baseline .secrets.baseline

# No PII in logs
grep -rn "logger.*email\|logger.*password\|logger.*token\|structlog.*email" services/ --include="*.py" | grep -v "test_\|# OK:"

# All auth endpoints require JWT (check EXCLUDED_PATHS completeness)
grep -n "EXCLUDED_PATHS" services/api/src/middleware/auth.py
```

- [ ] Every query on tenant-scoped tables includes `workspace_id` filter
- [ ] No passwords, emails, tokens in log statements
- [ ] No hardcoded credentials (detect-secrets passes)
- [ ] CORS origins not wildcarded in production config

```bash
# SAST scan
bandit -r services/orchestrator/src services/api/src -ll --format text
semgrep --config=auto --error services/ packages/ --quiet
```

Expected: **0 HIGH or CRITICAL findings**

---

## Section 5 — Documentation Completeness

```bash
# Python public functions without docstrings
python3 -c "
import ast
from pathlib import Path
for f in Path('services').rglob('*.py'):
    if 'test_' in f.name or '__pycache__' in str(f):
        continue
    try:
        tree = ast.parse(f.read_text())
        for node in ast.walk(tree):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                if not (ast.get_docstring(node)):
                    if not node.name.startswith('_'):
                        print(f'{f}:{node.lineno} — public function \"{node.name}\" missing docstring')
    except:
        pass
"

# TypeScript public exports without JSDoc
grep -rn "^export " apps/ packages/ --include="*.ts" --include="*.tsx" | grep -v "//" | grep -v "test\|spec" | head -20
```

- [ ] All public Python functions have Google-style docstrings
- [ ] All TypeScript public exports have JSDoc comments
- [ ] CHANGELOG.md ## [Unreleased] section updated
- [ ] Architecture diagrams updated if service boundaries changed

---

## Section 6 — Test Coverage

```bash
# Python coverage
pytest services/ --cov=services --cov-report=term-missing --cov-fail-under=85 -q

# TypeScript coverage
pnpm test -- --coverage --coverageThreshold='{"global":{"lines":85}}'

# BDD scenarios exist for all user-facing features
ls tests/features/
```

- [ ] Python coverage ≥ 85%
- [ ] TypeScript coverage ≥ 85%
- [ ] Gherkin .feature file exists for every new user-facing behavior
- [ ] Happy path + error path + auth failure scenario for each feature

---

## Section 7 — Contract Compliance

```bash
# OpenAPI specs exist for all new endpoints
ls docs/specs/openapi/v1/

# Validate all specs
npx @redocly/cli lint docs/specs/openapi/v1/*.yaml 2>/dev/null || echo "No specs to lint"

# Check contract-first enforcement (no route files without corresponding spec)
for f in services/api/src/routes/*.py; do
    resource=$(basename "$f" .py)
    if [ "$resource" != "__init__" ]; then
        spec="docs/specs/openapi/v1/${resource}.yaml"
        if [ ! -f "$spec" ]; then
            echo "WARNING: No OpenAPI spec for $f (expected at $spec)"
        fi
    fi
done
```

- [ ] OpenAPI spec exists for every route file in `services/api/src/routes/`
- [ ] All specs pass `@redocly/cli lint` with zero errors

---

## Section 8 — Multi-Tenancy

```bash
# Run cross-tenant isolation test
pytest tests/integration/python/test_cross_tenant_isolation.py -v

# Check all repository methods filter by workspace_id
grep -n "def.*workspace_id" services/api/src/repositories/*.py
```

- [ ] Cross-tenant queries return empty (not 403, not other tenant's data)
- [ ] All repository SELECT methods accept and apply `workspace_id` parameter
- [ ] workspace_id sourced from JWT `tenantId` claim only (never from request body)

---

## Output Format

After running all sections, output:

```
ENTERPRISE STANDARDS CHECK — Creator OS
========================================
Naming Conventions:    PASS ✓ | FAIL ✗ (N violations)
Code Size Limits:      PASS ✓ | FAIL ✗ (N violations)
Design Patterns:       PASS ✓ | FAIL ✗ (N violations)
Architecture:          PASS ✓ | FAIL ✗ (N violations)
Security:              PASS ✓ | FAIL ✗ (N violations)
Documentation:         PASS ✓ | FAIL ✗ (N violations)
Test Coverage:         PASS ✓ | FAIL ✗ (N% — need 85%)
Contracts:             PASS ✓ | FAIL ✗ (N missing specs)
Multi-Tenancy:         PASS ✓ | FAIL ✗ (N violations)

OVERALL: PASS / FAIL
If FAIL: PR submission is BLOCKED until all failures are resolved.
```

See docs/STANDARDS.md for the full standards reference.
See docs/GOVERNANCE.md for security and compliance requirements.
