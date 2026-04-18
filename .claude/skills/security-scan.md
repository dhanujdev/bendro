---
name: security-scan
description: >
  Runs the bendro security scan suite: Semgrep (JS/TS SAST), detect-secrets,
  and `pnpm audit --audit-level=high`. All gates must report zero
  high/critical findings before a PR can be merged. Also invoked by the
  session-end ritual.
---

# Skill: security-scan

Invoke before every PR is submitted. **All gates must pass (zero high/critical findings).**
Also invoked by the session-end ritual.

## Gate 1: Multi-Language SAST (Semgrep)
Covers JS/TS in `src/`, catching unsafe sinks (sql.raw, eval, exec, SSRF patterns, hardcoded secrets).

```bash
semgrep --config=auto \
  --error \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=drizzle \
  --exclude="**/*.test.ts" \
  --exclude="**/*.spec.ts" \
  src/
```
**Gate:** Zero findings from the auto ruleset.

If findings appear, either:
1. Fix the underlying code (preferred), or
2. Add an inline `// nosemgrep: <rule-id> — <reason>` comment with justification, reviewed by security-lead.

## Gate 2: Secret Detection
```bash
# First-time: create baseline
detect-secrets scan > .secrets.baseline

# Every run: scan and verify no NEW secrets vs baseline
detect-secrets scan --baseline .secrets.baseline
detect-secrets audit .secrets.baseline
```
**Gate:** Zero new secrets vs baseline.

If a real secret is found:
1. Remove it from the code immediately
2. Rotate the exposed credential — even if it was a test key
3. Regenerate the baseline: `detect-secrets scan > .secrets.baseline`
4. Commit the new baseline

## Gate 3: Node.js Dependency Audit
```bash
pnpm audit --audit-level=high
```
**Gate:** Zero HIGH or CRITICAL vulnerabilities.

If vulnerabilities appear:
```bash
# Try automatic fix first
pnpm update --latest {package}
pnpm audit --audit-level=high

# If no fix is available, check the advisory
pnpm audit --json | jq '.advisories[] | select(.severity == "high" or .severity == "critical")'
```

If no upstream fix exists, document in the PR and file a ticket with a remediation deadline. security-lead must sign off.

## Gate 4: Typecheck + Lint (defense in depth)
Not strictly "security," but catches many classes of unsafe patterns (`any`, missing null checks) that lead to security bugs.

```bash
pnpm typecheck
pnpm lint
```
**Gate:** Zero errors.

## Gate 5: Custom Grep Checks
Lightweight safety-net checks for bendro-specific invariants:

```bash
# No userId trusted from request body
grep -rn "body\.userId\|query\.userId\|params\.userId" src/app/api/ --include="*.ts"

# No sql.raw with user input (should be zero, or each one has a justifying comment)
grep -rn "sql\.raw(" src/ --include="*.ts"

# No env reads outside src/config/env.ts
grep -rn "process\.env\." src/ --include="*.ts" --include="*.tsx" | grep -v "src/config/env.ts"

# No MediaPipe / VRM imports outside the pose boundary
grep -rn "@mediapipe/\|kalidokit\|@pixiv/three-vrm" src/ --include="*.ts" --include="*.tsx" | \
  grep -v "src/lib/pose/\|src/app/player/camera/_components/"

# No Stripe SDK outside src/services/billing.ts
grep -rn "from 'stripe'" src/ --include="*.ts" | grep -v "src/services/billing.ts"
```
**Gate:** Each command outputs zero results (or each hit has a `// nosec: <reason>` comment).

## Gate 6: Container Scan (future — when/if bendro ships a container)
Bendro deploys to Vercel today, so there is no container scan. If a self-hosted container target is added:
```bash
trivy image --severity HIGH,CRITICAL --exit-code 1 bendro:$(git rev-parse --short HEAD)
```

## Interpreting Results

| Severity | Action |
|----------|--------|
| CRITICAL | BLOCK PR. security-lead must review and approve remediation. |
| HIGH     | BLOCK PR. Fix before merge, or document accepted risk with ticket + deadline. |
| MEDIUM   | Note in PR. Create follow-up ticket. Remediate within next two sprints. |
| LOW      | Note in PR. Remediate at convenience. |

## Recording Results
After running all gates, append to `docs/EXECUTION_LOG.md`:
```
[{timestamp}] Security scan: Semgrep={N}, Secrets={N new}, pnpm audit={N high/crit}, custom greps={N hits} | Result: PASS/FAIL
```

## One-Liner
```bash
pnpm typecheck && pnpm lint && \
  semgrep --config=auto --error src/ && \
  detect-secrets scan --baseline .secrets.baseline && \
  pnpm audit --audit-level=high && \
  echo "SECURITY SCAN: PASS"
```
