# ADR-{NUMBER}: {Short Title}

**Status:** Proposed | Accepted | Deprecated | Superseded  
**Date:** {YYYY-MM-DD}  
**Deciders:** {agent or team who made this decision}  
**Supersedes:** (ADR-XXXX if this replaces an earlier decision)  
**Superseded by:** (ADR-XXXX if a later decision replaces this one)

---

## Context

{Describe the problem, constraint, or architectural question that necessitates this decision.
Include:
- What system behavior or quality attribute is at stake
- What forces are in tension (performance vs. simplicity, security vs. convenience, etc.)
- Any relevant constraints (legal, business, technical, team capability)
- Why this decision cannot be deferred}

---

## Decision

{State the decision clearly in one or two sentences.
Use active voice: "We will use X" or "We adopt X as the Y for Z."}

---

## Rationale

{Explain WHY this option was chosen over the alternatives.
Link to any research, benchmarks, or prior art that informed the decision.}

### Options Considered

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **{Option A — chosen}** | {pro1}, {pro2} | {con1} | **Chosen** |
| {Option B} | {pro1} | {con1}, {con2} | Rejected — {one-line reason} |
| {Option C} | {pro1} | {con1} | Rejected — {one-line reason} |

---

## Consequences

### Positive
- {Benefit 1 — what gets better as a result}
- {Benefit 2}

### Negative
- {Trade-off 1 — what gets harder or more complex}
- {Trade-off 2}

### Neutral
- {Fact about how this changes the system — neither good nor bad}

---

## Implementation Notes

{Specific guidance for implementers — what files to create/change, what patterns to use,
what to watch out for. This section is optional for pure process ADRs.}

```
# Key files affected:
services/...
packages/...
docs/specs/...
```

---

## Compliance

{Does this decision touch security, legal, multi-tenancy, or compliance concerns?
If yes, specify what guardrails are required.}

- [ ] Security implications reviewed by security-lead
- [ ] Multi-tenancy invariant preserved (workspace_id scoping)
- [ ] Legal compliance checked (if content-generating feature)
- [ ] Audit trail required for new actions: yes / no

---

## References

- {Link to relevant RFC, library docs, blog post, or prior art}
- {Link to related ADRs}
- {Link to spec document in docs/specs/ if applicable}
