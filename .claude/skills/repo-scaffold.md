# Skill: repo-scaffold

Invoke when initializing or verifying the repository structure.
Run at the start of Phase 0 and at the start of any phase that introduces a new major directory.

## Required Directory Structure
```bash
# Verify all directories exist:
check_dirs=(
  "apps/web"
  "apps/admin"
  "services/api/src/routes"
  "services/api/src/services"
  "services/api/src/repositories"
  "services/api/src/schemas"
  "services/api/src/middleware"
  "services/api/src/dependencies"
  "services/orchestrator/src/graphs"
  "services/orchestrator/src/nodes"
  "services/orchestrator/src/state"
  "services/orchestrator/src/validators/deterministic"
  "services/orchestrator/src/validators/semantic"
  "services/orchestrator/src/validators/evaluator"
  "services/orchestrator/src/providers"
  "services/orchestrator/src/repositories"
  "services/orchestrator/tests"
  "services/workers"
  "services/ai/src"
  "packages/db/prisma/migrations"
  "packages/db/prisma/seed"
  "packages/shared/src"
  "packages/policy-engine/src"
  "packages/observability/src"
  "infra/docker"
  "infra/k8s"
  "infra/scripts"
  "docs/ADR"
  "docs/specs/openapi/v1"
  "docs/specs/asyncapi"
  "docs/specs/workflows"
  "docs/architecture"
  "docs/examples/policy"
  "tests/features/auth"
  "tests/features/workflows"
  "tests/features/policies"
  "tests/features/approvals"
  "tests/features/artifacts"
  "tests/features/admin"
  "tests/step_definitions"
  "tests/unit/python"
  "tests/unit/ts"
  "tests/integration"
  "tests/e2e"
  ".claude/agents"
  ".claude/skills"
  ".claude/hooks"
  ".claude/commands"
  ".github/workflows"
)

for dir in "${check_dirs[@]}"; do
  if [ ! -d "$dir" ]; then
    echo "MISSING: $dir"
    mkdir -p "$dir"
    echo "CREATED: $dir"
  else
    echo "OK: $dir"
  fi
done
```

## Required Root Files
```
CLAUDE.md               ← master execution rules
CHANGELOG.md            ← Keep a Changelog format
CONTRIBUTING.md         ← contributor guide
Makefile                ← all dev commands
README.md               ← project overview
.pre-commit-config.yaml ← git hooks
pyproject.toml          ← Python tooling config
.mcp.json               ← MCP server config
.secrets.baseline       ← detect-secrets baseline
.semgreprc              ← semgrep config
.env.example            ← environment variable template
.gitignore              ← git ignore rules
docker-compose.yml      ← local dev services
docker-compose.test.yml ← isolated test services
pnpm-workspace.yaml     ← monorepo config
tsconfig.base.json      ← shared TypeScript config
```

## Required .claude/ Files
```
.claude/settings.json
.claude/agents/ (12 agent files)
.claude/skills/ (15 skill files)
.claude/hooks/  (8 hook files)
.claude/commands/ (7 command files)
```

## Required docs/ Files
```
docs/STANDARDS.md
docs/GOVERNANCE.md
docs/PHASE_TEMPLATES.md
docs/DATA_CLASSIFICATION.md
docs/AGENT_MEMORY.md
docs/EXECUTION_LOG.md
docs/SESSION_HANDOFF.md
docs/DECISIONS.md
docs/BLOCKERS.md
docs/NEXT_STEPS.md
docs/ADR/0001 through 0015
docs/specs/ (10 spec files)
docs/architecture/ (6 diagram files)
docs/examples/policy/ (2 example files)
```

## Verification Command
```bash
# Quick count check
echo "Agents: $(ls .claude/agents/*.md 2>/dev/null | wc -l) (expected 12)"
echo "Skills: $(ls .claude/skills/*.md 2>/dev/null | wc -l) (expected 15)"
echo "Hooks:  $(ls .claude/hooks/* 2>/dev/null | wc -l) (expected 8)"
echo "Commands: $(ls .claude/commands/*.md 2>/dev/null | wc -l) (expected 7)"
echo "ADRs: $(ls docs/ADR/*.md 2>/dev/null | wc -l) (expected 15)"
echo "Specs: $(ls docs/specs/*.md 2>/dev/null | wc -l) (expected 10)"
echo "Diagrams: $(ls docs/architecture/*.md 2>/dev/null | wc -l) (expected 6)"
```
