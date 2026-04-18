# Command: security-report

**Usage:** `/security-report`

Run the full security scan suite and display a formatted findings report.
Equivalent to `make security-scan` with enhanced output formatting.

## What This Command Does

1. Runs all 4 security gates (bandit, semgrep, detect-secrets, pnpm audit)
2. Parses findings and categorizes by severity
3. Outputs a structured report with actionable remediation guidance
4. Appends results to docs/EXECUTION_LOG.md
5. If any HIGH or CRITICAL findings: clearly indicates PR cannot merge

## Commands Executed
```bash
# Gate 1: Python SAST
python -m bandit -r services/ -ll --format json

# Gate 2: Multi-language SAST  
semgrep --config=auto --json services/ packages/ apps/

# Gate 3: Secret detection
detect-secrets scan --baseline .secrets.baseline

# Gate 4: Dependency audit
pnpm audit --json --audit-level=moderate
```

## Report Format
```
=== Security Report ===
Date: {YYYY-MM-DD HH:MM UTC}
Branch: {current branch}

GATE 1: BANDIT (Python SAST)
  Status: PASS / FAIL
  Critical:  {N} findings
  High:      {N} findings
  Medium:    {N} findings (tracked, does not block)
  
  [HIGH] services/api/src/routes/auth.py:45
    Issue: Use of MD5 for password hashing
    CWE: B303
    Fix: Replace hashlib.md5 with bcrypt or argon2
    
GATE 2: SEMGREP (Multi-language SAST)
  Status: PASS / FAIL
  Findings: {N}
  ...

GATE 3: DETECT-SECRETS
  Status: PASS / FAIL
  New secrets vs baseline: {N}
  ...

GATE 4: PNPM AUDIT
  Status: PASS / FAIL
  Critical: {N} | High: {N} | Moderate: {N}
  ...

=== OVERALL RESULT ===
  PASS — Safe to submit PR   ✓
  OR
  FAIL — {N} blocking issues — Do NOT submit PR until resolved

BLOCKING ISSUES:
  1. [CRITICAL - bandit] {file}:{line} — {issue} — Fix: {specific action}
  2. [HIGH - semgrep] {file}:{line} — {issue} — Fix: {specific action}
```

## After a FAIL Result
1. Do NOT submit the PR
2. Fix all CRITICAL and HIGH findings
3. For each finding: make the specific code change, then re-run `/security-report`
4. If a finding is a false positive: add to `.semgrepignore` or `# nosec` comment with justification
5. Only when all gates show PASS: submit the PR and invoke `/review-pr {branch}`

## Scheduled Security Checks
The GitHub Actions `security-advisory.yml` workflow runs this automatically daily
and creates a GitHub issue if new findings are found in dependencies.
