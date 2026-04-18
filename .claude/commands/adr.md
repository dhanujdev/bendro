# Command: adr

**Usage:** `/adr "Title of the architectural decision"`

Invoke the architect agent to write a new ADR.
**The ADR must be written and committed before any implementation begins.**

## What This Command Does

1. Invokes the architect agent (claude-opus-4-6)
2. Reads existing ADRs to find the next sequential number
3. Invokes the `create-adr` skill
4. Drafts the ADR following the standard template
5. Presents the draft for review
6. On confirmation: saves to `docs/ADR/{NNNN}-{kebab-case-title}.md`
7. Updates `docs/DECISIONS.md` with a summary entry
8. Commits the ADR: `git commit -m "docs(adr): ADR-{NNNN} {title}"`

## Status Flow
```
Draft → Proposed (presented for review) → Accepted (committed) → Implemented
```
The implementation only begins after the ADR reaches Accepted status.

## Example
```
/adr "Use Redis for session token revocation"

→ architect agent writes ADR-0016:
   Context: Need to revoke JWTs before expiry for security...
   Decision: Use Redis sorted sets to store revoked JTI claims...
   Alternatives: DB-based blocklist, short-lived tokens only, signed logout...
   Consequences: Requires Redis in all environments, adds operational complexity...

→ Review the ADR
→ If approved: saved to docs/ADR/0016-redis-jwt-revocation.md
→ docs/DECISIONS.md updated
→ Committed
→ Implementation can now begin
```

## When to Use This Command
- Before choosing between two technical approaches
- Before adding a new service or major package
- Before changing how two services communicate
- Before introducing a new cross-cutting pattern
- Before changing the database schema in a fundamental way
- When a decision is made that future agents need to understand
