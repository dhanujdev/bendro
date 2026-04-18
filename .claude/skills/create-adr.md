---
name: create-adr
description: >
  Creates a numbered Architectural Decision Record in docs/ADR/NNNN-<slug>.md.
  ADRs 0001–0010 are reserved for foundation decisions. Use for any
  technology choice, new module boundary, or cross-cutting concern. Commit
  the ADR before implementing the decision.
---

# Skill: create-adr

Invoke this skill whenever a major technical or architectural decision is being made.
**Do not implement the decision before the ADR is written and its Status is Accepted.**

## When to Invoke
- Choosing between technology options (library, pattern, infra primitive)
- Defining a new module boundary or changing an existing one
- Changing a prior architectural decision (supersedes the old ADR)
- Introducing a new cross-cutting concern (auth, billing, observability, safety)

## File Location
`docs/ADR/{NNNN}-{kebab-case-title}.md`

Find the current max ADR number:
```bash
ls docs/ADR/ | sort | tail -1
```
Use the next sequential number.

## Required Template
```markdown
# ADR-{NNNN}: {Short Decision-Focused Title}

**Status:** Draft | Proposed | Accepted | Superseded by ADR-{NNNN} | Deprecated
**Date:** {YYYY-MM-DD}
**Authors:** {agent-name(s)}
**Deciders:** architect (required), security-lead (if security-related)

---

## Context

{Why was this decision needed? What constraints, forces, or requirements drove it?
What problem are we solving? What were the key non-functional requirements?}

## Decision

{What was decided? State it clearly and specifically.
Use active voice: "We will use X for Y because Z."}

## Alternatives Considered

### Option A: {Name}
- Description: {what this option is}
- Pros: {advantages}
- Cons: {disadvantages}
- Why rejected: {specific reason}

### Option B: {Name}
...

## Consequences

### Positive
- {What becomes easier or better}

### Negative / Trade-offs
- {What becomes harder, more constrained, or requires additional work}

### Neutral
- {Changes that are neither good nor bad}

## Follow-up Actions
- [ ] {Implementation step required by this decision}
- [ ] {Documentation update required (diagrams, CHANGELOG, etc.)}
- [ ] {Other agent to notify of this decision}

## References
- {Link to relevant doc, prior ADR, or external resource}
```

## After Writing the ADR
1. Add a row to `docs/DECISIONS.md`:
   `| ADR-{NNNN} | {one-line summary} | {date} | {status} |`
2. If this supersedes an existing ADR, set the old ADR's Status to `Superseded by ADR-{NNNN}`
3. Commit the ADR BEFORE writing any implementation code:
   `git commit -m "docs(adr): ADR-{NNNN} {short title}"`

## Reserved ADR Numbers (Foundation)
Numbers 0001–0010 are reserved for foundation decisions, allocated as bendro phases land them:
- 0001: Doc-driven execution + skills/agents framework port from Creator OS
- 0002: Next.js 16 App Router + React 19 + TS 5 as the core stack
- 0003: Drizzle ORM + Neon serverless Postgres with in-memory mock fallback (src/lib/data.ts)
- 0004: Single data adapter boundary (src/lib/data.ts) — no env branching in callers
- 0005: Pose/VRM single-module boundary (src/lib/pose/vrm-driver.ts)
- 0006: NextAuth.js for authentication (Phase 3)
- 0007: Stripe for billing, webhooks verify signature + idempotent (Phase 9)
- 0008: Contract-first (OpenAPI) + BDD/TDD mandate
- 0009: Observability via Sentry + Vercel Analytics (Phase 12)
- 0010: AI client single boundary (src/services/ai/ai-client.ts) — when AI routine gen lands
- 0011+: Available for future decisions

Numbers that are not yet filed are still reserved. If you need to file ADR-0006 but 0005 doesn't exist yet, create both or renumber consistently — never skip or duplicate.
