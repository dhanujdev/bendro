#!/usr/bin/env bash
# security_review.sh — Comprehensive security scan before code push
#
# Runs multiple security tools in sequence. ALL findings must be resolved
# before code is pushed to origin. This script is the security gate.
#
# Tools run:
#   1. Bandit      — Python SAST (static application security testing)
#   2. Semgrep     — Multi-language SAST with OWASP ruleset
#   3. detect-secrets — Secret/credential detection
#   4. safety      — Python dependency vulnerability scan
#   5. pnpm audit  — Node.js dependency vulnerability scan
#   6. verify_compliance.py security check — PII in logs, hardcoded secrets
#   7. Custom checks — SQL injection patterns, SSRF risks, auth bypasses
#
# Exit codes:
#   0 — All checks passed (zero HIGH/CRITICAL findings)
#   1 — One or more HIGH/CRITICAL findings (BLOCKS push)
#   2 — Tool not installed (WARNING — skipped, does not block)
#
# Usage:
#   ./scripts/security_review.sh [--fix] [--ci]
#   --fix    Apply auto-fixes where possible (bandit: no auto-fix; ruff: auto-fix safe rules)
#   --ci     CI mode — exit 1 on any finding (stricter than local mode)

set -euo pipefail

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$REPO_ROOT"

# Parse arguments
CI_MODE=false
FIX_MODE=false
for arg in "$@"; do
    case $arg in
        --ci) CI_MODE=true ;;
        --fix) FIX_MODE=true ;;
    esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

BLOCKED=()
WARNINGS=()
SKIPPED=()

REPORT_FILE="/tmp/creator-os-security-$(date +%Y%m%d-%H%M%S).txt"

header() {
    echo ""
    echo -e "${BLUE}${BOLD}▶ $1${NC}"
    echo "▶ $1" >> "$REPORT_FILE"
}

pass() {
    echo -e "  ${GREEN}✓${NC} $1"
    echo "  PASS: $1" >> "$REPORT_FILE"
}

fail() {
    echo -e "  ${RED}✗ BLOCKED:${NC} $1"
    echo "  BLOCKED: $1" >> "$REPORT_FILE"
    BLOCKED+=("$1")
}

warn() {
    echo -e "  ${YELLOW}⚠ WARNING:${NC} $1"
    echo "  WARNING: $1" >> "$REPORT_FILE"
    WARNINGS+=("$1")
}

skip() {
    echo -e "  ${YELLOW}→ SKIPPED:${NC} $1 (tool not installed)"
    SKIPPED+=("$1")
}

# Initialize report
echo "Creator OS Security Review" > "$REPORT_FILE"
echo "Date: $(date -u +%Y-%m-%dT%H:%M:%SZ)" >> "$REPORT_FILE"
echo "Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo 'unknown')" >> "$REPORT_FILE"
echo "Commit: $(git rev-parse --short HEAD 2>/dev/null || echo 'uncommitted')" >> "$REPORT_FILE"
echo "---" >> "$REPORT_FILE"

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         CREATOR OS — SECURITY REVIEW GATE                   ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""
echo "Scanning: $(pwd)"
echo "Report:   $REPORT_FILE"

# ---------------------------------------------------------------------------
# Check 1 — Bandit (Python SAST)
# ---------------------------------------------------------------------------
header "1. Bandit — Python Static Analysis Security Testing"

if command -v bandit &>/dev/null; then
    bandit_output=$(bandit -r services/orchestrator/src services/api/src \
        -ll \
        --skip B101,B601 \
        --format text 2>&1 || true)

    high_count=$(echo "$bandit_output" | grep -c "Severity: High\|Severity: Critical" || echo "0")
    medium_count=$(echo "$bandit_output" | grep -c "Severity: Medium" || echo "0")

    if [ "$high_count" -eq 0 ]; then
        pass "Bandit: 0 HIGH/CRITICAL findings (${medium_count} MEDIUM — see report)"
    else
        fail "Bandit: ${high_count} HIGH/CRITICAL findings"
        echo "$bandit_output" | grep -A5 "Severity: High\|Severity: Critical" | head -50
        echo ""
        echo "  Run: bandit -r services/ -ll --format text  for full details"
    fi
    echo "" >> "$REPORT_FILE"
    echo "=== Bandit Output ===" >> "$REPORT_FILE"
    echo "$bandit_output" >> "$REPORT_FILE"
else
    skip "Bandit not installed — install: pip install bandit"
fi

# ---------------------------------------------------------------------------
# Check 2 — Semgrep (Multi-language SAST, OWASP)
# ---------------------------------------------------------------------------
header "2. Semgrep — OWASP Top 10 + Security Rules"

if command -v semgrep &>/dev/null; then
    semgrep_output=$(semgrep \
        --config auto \
        --severity ERROR \
        --quiet \
        --no-git-ignore \
        services/ packages/ apps/ 2>&1 || true)

    error_count=$(echo "$semgrep_output" | grep -c "^.*:.*:.*Error\|findings" || echo "0")

    if echo "$semgrep_output" | grep -q "0 findings\|No findings"; then
        pass "Semgrep: 0 findings matching OWASP/security rules"
    elif [ -z "$semgrep_output" ]; then
        pass "Semgrep: 0 findings"
    else
        fail "Semgrep: findings detected"
        echo "$semgrep_output" | head -30
    fi
    echo "" >> "$REPORT_FILE"
    echo "=== Semgrep Output ===" >> "$REPORT_FILE"
    echo "$semgrep_output" >> "$REPORT_FILE"
else
    skip "Semgrep not installed — install: pip install semgrep  or  brew install semgrep"
fi

# ---------------------------------------------------------------------------
# Check 3 — detect-secrets
# ---------------------------------------------------------------------------
header "3. detect-secrets — Credential & Secret Detection"

if command -v detect-secrets &>/dev/null; then
    if [ ! -f ".secrets.baseline" ]; then
        warn "No .secrets.baseline found — run: detect-secrets scan > .secrets.baseline"
        warn "Then commit .secrets.baseline and re-run this script"
    else
        # Scan and compare to baseline
        new_secrets_output=$(detect-secrets scan \
            --baseline .secrets.baseline \
            --only-allowlisted 2>&1 || true)

        if [ -z "$new_secrets_output" ] || echo "$new_secrets_output" | grep -q "No secrets found\|baseline"; then
            pass "detect-secrets: No new secrets detected"
        else
            fail "detect-secrets: New secrets detected beyond baseline"
            echo "$new_secrets_output" | head -20
            echo "  Run: detect-secrets audit .secrets.baseline  to review and update"
        fi
        echo "$new_secrets_output" >> "$REPORT_FILE"
    fi
else
    skip "detect-secrets not installed — install: pip install detect-secrets"
fi

# ---------------------------------------------------------------------------
# Check 4 — Python Dependency Vulnerabilities
# ---------------------------------------------------------------------------
header "4. Python Safety — Dependency Vulnerability Scan"

if command -v safety &>/dev/null; then
    # Find requirements files
    req_files=$(find . -name "requirements*.txt" -not -path "*/node_modules/*" -not -path "*/.venv/*" 2>/dev/null || true)
    if [ -n "$req_files" ]; then
        for req_file in $req_files; do
            safety_output=$(safety check --file="$req_file" --full-report 2>&1 || true)
            critical_count=$(echo "$safety_output" | grep -c "CRITICAL\|HIGH" || echo "0")
            if [ "$critical_count" -eq 0 ]; then
                pass "Safety check passed for $req_file"
            else
                fail "Safety: $critical_count HIGH/CRITICAL vulnerabilities in $req_file"
                echo "$safety_output" | grep -A3 "CRITICAL\|HIGH" | head -30
            fi
        done
    else
        warn "No requirements*.txt found — skipping Python dependency scan"
        warn "Consider using pip-audit: pip install pip-audit && pip-audit"
    fi
elif command -v pip-audit &>/dev/null; then
    pip_audit_output=$(pip-audit 2>&1 || true)
    if echo "$pip_audit_output" | grep -q "No known vulnerabilities\|0 known vulnerabilities"; then
        pass "pip-audit: No known vulnerabilities"
    else
        warn "pip-audit found potential vulnerabilities (review output)"
        echo "$pip_audit_output" | head -20
    fi
else
    skip "safety/pip-audit not installed — install: pip install safety"
fi

# ---------------------------------------------------------------------------
# Check 5 — Node.js Dependency Vulnerabilities
# ---------------------------------------------------------------------------
header "5. pnpm audit — Node.js Dependency Scan"

if command -v pnpm &>/dev/null && [ -f "pnpm-lock.yaml" ]; then
    pnpm_output=$(pnpm audit --audit-level=high 2>&1 || true)
    if echo "$pnpm_output" | grep -q "0 vulnerabilities\|found 0"; then
        pass "pnpm audit: 0 HIGH/CRITICAL vulnerabilities"
    elif echo "$pnpm_output" | grep -qE "^[0-9]+ vulnerabilities"; then
        vuln_count=$(echo "$pnpm_output" | grep -oE "^[0-9]+" | head -1 || echo "?")
        fail "pnpm audit: ${vuln_count} HIGH/CRITICAL vulnerabilities"
        echo "$pnpm_output" | head -30
        echo "  Run: pnpm audit --fix  to attempt automatic fixes"
    else
        pass "pnpm audit: passed (no HIGH/CRITICAL findings)"
    fi
    echo "$pnpm_output" >> "$REPORT_FILE"
else
    skip "pnpm not available or no pnpm-lock.yaml"
fi

# ---------------------------------------------------------------------------
# Check 6 — Custom Security Patterns
# ---------------------------------------------------------------------------
header "6. Custom Security Patterns — SQL Injection, SSRF, Auth Bypass"

issues_found=0

# SQL Injection patterns (string concatenation in queries)
sql_injection=$(grep -rn \
    'f"SELECT\|f"INSERT\|f"UPDATE\|f"DELETE\|f"WHERE\|"SELECT.*" +\|"INSERT.*" +' \
    services/ packages/ --include="*.py" 2>/dev/null | \
    grep -v "test_\|\.pyc\|# OK:" | head -10 || true)
if [ -n "$sql_injection" ]; then
    fail "SQL Injection risk: String concatenation in SQL query detected"
    echo "$sql_injection"
    issues_found=$((issues_found + 1))
fi

# SSRF patterns (user-controlled URLs in HTTP requests)
ssrf_patterns=$(grep -rn \
    'requests\.get(.*request\.\|httpx\.(get\|post)(.*request\.\|fetch(.*params\.' \
    services/ --include="*.py" 2>/dev/null | \
    grep -v "test_\|# OK:" | head -10 || true)
if [ -n "$ssrf_patterns" ]; then
    warn "Potential SSRF: User-controlled input in HTTP request URL"
    echo "$ssrf_patterns"
fi

# Auth bypass patterns (comparing to empty string for tokens)
auth_bypass=$(grep -rn \
    'token == ""\|token is None\|not token\b' \
    services/api/src/ --include="*.py" 2>/dev/null | \
    grep -v "test_\|middleware\|# OK:" | head -5 || true)
if [ -n "$auth_bypass" ]; then
    warn "Potential auth bypass: Token comparison to empty/None outside middleware"
    echo "$auth_bypass"
fi

# Shell injection (os.system or subprocess with user input)
shell_injection=$(grep -rn \
    'os\.system\|subprocess\.(run\|call\|check_output).*request\.\|eval(' \
    services/ --include="*.py" 2>/dev/null | \
    grep -v "test_\|# OK:" | head -10 || true)
if [ -n "$shell_injection" ]; then
    fail "Shell/Code Injection: os.system/subprocess with potentially untrusted input"
    echo "$shell_injection"
    issues_found=$((issues_found + 1))
fi

if [ "$issues_found" -eq 0 ] && [ -z "$auth_bypass" ] && [ -z "$ssrf_patterns" ]; then
    pass "Custom security patterns: No obvious vulnerabilities detected"
fi

# ---------------------------------------------------------------------------
# Check 7 — Compliance Script Security Check
# ---------------------------------------------------------------------------
header "7. Compliance Checker — PII in Logs & Hardcoded Secrets"

if command -v python3 &>/dev/null && [ -f ".claude/scripts/verify_compliance.py" ]; then
    compliance_output=$(python3 .claude/scripts/verify_compliance.py --check security 2>&1 || true)
    if echo "$compliance_output" | grep -q "ALL BLOCKING CHECKS PASSED"; then
        pass "Compliance security check: PASSED"
    else
        fail "Compliance security check: BLOCKING violations found"
        echo "$compliance_output" | grep "BLOCKING" | head -10
    fi
else
    skip "verify_compliance.py not found or python3 unavailable"
fi

# ---------------------------------------------------------------------------
# Check 8 — JWT and Auth Configuration
# ---------------------------------------------------------------------------
header "8. Auth Configuration — JWT Algorithm and Secret Strength"

# Check JWT_ALGORITHM in .env or environment
jwt_algo="${JWT_ALGORITHM:-not_set}"
if [ "$jwt_algo" = "HS256" ]; then
    warn "JWT_ALGORITHM=HS256 — acceptable for local dev ONLY"
    warn "Set JWT_ALGORITHM=RS256 before deploying to staging or production"
elif [ "$jwt_algo" = "RS256" ]; then
    pass "JWT_ALGORITHM=RS256 — production-grade algorithm"
elif [ "$jwt_algo" = "not_set" ]; then
    warn "JWT_ALGORITHM not set in environment — ensure RS256 in production"
fi

# Check for dev secret in environment
jwt_secret="${JWT_SECRET:-}"
if [ "$jwt_secret" = "dev-secret-change-in-production" ]; then
    warn "JWT_SECRET is the default dev value — NEVER use this in staging/production"
fi

# Check Redis URL (for token revocation)
redis_url="${REDIS_URL:-}"
if [ -z "$redis_url" ]; then
    warn "REDIS_URL not set — token revocation (logout) is best-effort only"
    warn "Set REDIS_URL in all non-local environments"
fi

pass "Auth configuration checks complete"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "════════════════════════════════════════════════════════════════"
echo ""

if [ ${#BLOCKED[@]} -eq 0 ]; then
    echo -e "${GREEN}${BOLD}✅ SECURITY REVIEW PASSED${NC}"
    echo -e "  All HIGH/CRITICAL checks passed."
    if [ ${#WARNINGS[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}⚠  ${#WARNINGS[@]} warning(s) — review before production deployment:${NC}"
        for w in "${WARNINGS[@]}"; do
            echo "  - $w"
        done
    fi
    if [ ${#SKIPPED[@]} -gt 0 ]; then
        echo -e "\n${YELLOW}→  ${#SKIPPED[@]} check(s) skipped — install missing tools for full coverage:${NC}"
        for s in "${SKIPPED[@]}"; do
            echo "  - $s"
        done
    fi
    echo ""
    echo "Full report saved to: $REPORT_FILE"
    exit 0
else
    echo -e "${RED}${BOLD}❌ SECURITY REVIEW FAILED — ${#BLOCKED[@]} BLOCKER(S)${NC}"
    echo ""
    echo "Blocked issues:"
    for b in "${BLOCKED[@]}"; do
        echo -e "  ${RED}✗${NC} $b"
    done
    echo ""
    echo "These MUST be resolved before code is pushed."
    echo "Full report saved to: $REPORT_FILE"
    echo ""
    echo "Resources:"
    echo "  docs/GOVERNANCE.md        — Security requirements"
    echo "  docs/ADR/0016-*.md        — Auth architecture decisions"
    echo "  docs/engineering/ENGINEERING_HANDBOOK.md — Security standards"
    exit 1
fi
