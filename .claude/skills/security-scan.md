# Skill: security-scan

Invoke before every PR is submitted. **All gates must pass (zero high/critical findings).**
Also invoked by the session-end ritual (make security-scan).

## Gate 1: Python SAST (Bandit)
```bash
python -m bandit -r services/orchestrator/src services/ai/src -ll --format json \
  | python3 -c "
import json, sys
data = json.load(sys.stdin)
high_critical = [r for r in data['results'] if r['issue_severity'] in ('HIGH', 'CRITICAL')]
if high_critical:
    for r in high_critical:
        print(f\"FAIL [{r['issue_severity']}] {r['filename']}:{r['line_number']} — {r['issue_text']}\")
    sys.exit(1)
else:
    print(f\"PASS: {len(data['results'])} total findings, 0 HIGH/CRITICAL\")
"
```
**Gate:** Zero HIGH or CRITICAL severity findings.
MEDIUM findings: document in PR, assign remediation ticket.

## Gate 2: Multi-Language SAST (Semgrep)
```bash
semgrep --config=auto \
  --error \
  --exclude=node_modules \
  --exclude=.venv \
  --exclude=tests/ \
  services/ packages/ apps/
```
**Gate:** Zero findings from auto ruleset.

## Gate 3: Secret Detection
```bash
detect-secrets scan --baseline .secrets.baseline
# Then verify no new secrets vs baseline:
detect-secrets audit .secrets.baseline
```
**Gate:** Zero new secrets introduced vs baseline.

If secrets are found:
1. Remove the secret from the code immediately
2. Rotate the exposed credential (even if it was just a test key)
3. Regenerate the baseline: `detect-secrets scan > .secrets.baseline`
4. Commit the new baseline

## Gate 4: Node.js Dependency Audit
```bash
pnpm audit --audit-level=high
```
**Gate:** Zero HIGH or CRITICAL vulnerabilities.

If vulnerabilities found:
```bash
# Try automatic fix first
pnpm audit --fix

# If that breaks things, check the advisory:
pnpm audit --json | python3 -c "
import json, sys
data = json.load(sys.stdin)
for adv in data.get('advisories', {}).values():
    if adv['severity'] in ('high', 'critical'):
        print(f\"{adv['severity'].upper()}: {adv['title']} — {adv['module_name']} {adv['findings'][0]['version']}\")
        print(f\"  Fix: {adv['recommendation']}\")
"
```

## Gate 5: Container Scan (when Docker images are built)
```bash
# Scan API image
trivy image --severity HIGH,CRITICAL --exit-code 1 creator-os-api:$(git rev-parse --short HEAD)

# Scan orchestrator image
trivy image --severity HIGH,CRITICAL --exit-code 1 creator-os-orchestrator:$(git rev-parse --short HEAD)
```
**Gate:** Zero CRITICAL CVEs in base images or dependencies.

## Interpreting Results

| Severity | Action |
|----------|--------|
| CRITICAL | BLOCK PR immediately. Security-lead must review and approve remediation. |
| HIGH | BLOCK PR. Fix before merge. Document in PR if using accepted risk. |
| MEDIUM | Note in PR. Create ticket. Remediate in next sprint. |
| LOW | Note in PR. Remediate at convenience. |

## Recording Results
After running all gates, append to docs/EXECUTION_LOG.md:
```
[{timestamp}] Security scan: Bandit={N high/crit}, Semgrep={N findings}, Secrets={N new}, npm audit={N high/crit} | Result: PASS/FAIL
```

## Full Makefile Command
```bash
make security-scan
# This runs all gates in sequence and reports combined result
```
