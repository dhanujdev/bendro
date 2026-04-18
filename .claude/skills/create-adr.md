# Skill: create-adr

Invoke this skill whenever a major technical or architectural decision is being made.
**Do not implement the decision before the ADR is written and its status is Accepted.**

## When to Invoke
- Choosing between technology options (framework, library, pattern)
- Defining a new service boundary or package responsibility
- Changing an existing architectural decision (supersedes old ADR)
- Introducing a new cross-cutting concern (security, observability, etc.)

## File Location
`docs/ADR/{NNNN}-{kebab-case-title}.md`

Find the current max ADR number:
```bash
ls docs/ADR/ | sort | tail -1
```
Use next sequential number.

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
- [ ] {Documentation update required}
- [ ] {Other agent to notify of this decision}

## References
- {Link to relevant doc, prior ADR, or external resource}
```

## After Writing the ADR
1. Add to docs/DECISIONS.md:
   `| ADR-{NNNN} | {one-line summary} | {date} | {status} |`
2. If this supersedes an existing ADR, update the old ADR's Status field
3. Commit the ADR BEFORE writing any implementation code

## Reserved ADR Numbers
- 0001: Monorepo + doc-driven execution
- 0002: Tech stack selection
- 0003: Direct LLM API for MVP packaging
- 0004: LangGraph as exclusive orchestration runtime
- 0005: Multi-tenancy via workspace_id row-level isolation
- 0006: Three-layer validator architecture
- 0007: Model abstraction via single model_router.py
- 0008: LangSmith as AI observability
- 0009: Append-only event-sourced audit log
- 0010: FastAPI backend migration
- 0011: Inngest workers with Temporal migration path
- 0012: pgvector embedding storage
- 0013: Contract-first development
- 0014: BDD/TDD mandate
- 0015: Repository pattern for all DB access
- 0016+: Available for future decisions
