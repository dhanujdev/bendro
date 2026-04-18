# Decisions Log

> Running log of decisions made during work sessions. Complements `docs/ADR/*`:
> - **ADRs** are formal architecture decisions (one file per decision, immutable once Accepted).
> - **This file** is everything else — naming choices, library selections, scope trade-offs,
>   phase re-ordering. Append only; never rewrite history.

Last updated: 2026-04-18

---

## D-001 — Framework port from Creator OS rather than ground-up scaffold
- **Date:** 2026-04-18 (session 1)
- **Decided by:** architect
- **Context:** User asked to apply Creator OS methodology to bendro.
- **Choice:** Mechanically port `.claude/` (agents, skills, hooks, commands, rules, scripts), then adapt all domain-specific content.
- **Why:** The Creator OS framework encodes 20+ phases of lived lessons (TDD/BDD discipline, contract-first, action logging, PR gates). Rebuilding these from scratch would lose that compounded value. Adapting is cheaper than reinventing.
- **Consequence:** Some Creator OS tooling (LangGraph review skill, policy-engine check, cost-tracking) doesn't apply and has been deleted.

## D-002 — 16-phase plan (0–15) ending at Vercel deploy
- **Date:** 2026-04-18 (session 1)
- **Decided by:** architect
- **Context:** Bendro has narrower surface area than Creator OS (single Next.js app, no orchestrator, no admin control plane, no LangGraph).
- **Choice:** Collapse Creator OS's 21-phase plan into 16 bendro phases. See `CLAUDE.md` §12 and `docs/PHASES.md` for the full list.
- **Why:** Fewer services ⇒ fewer phases. Phase gates kept where they add value (auth, billing, health safety); dropped where they don't (workflow catalog, evaluation harness, audit system).
- **Consequence:** `planner` agent uses the 16-phase list; `phase-closeout` skill references this set.

## D-003 — LEGAL_RULES.md → HEALTH_RULES.md
- **Date:** 2026-04-18 (session 1)
- **Decided by:** security-lead + architect
- **Context:** Creator OS's legal rules focus on AI-content liability (CSAM, defamation, electoral manipulation). Bendro's legal risk profile is injury/medical-advice liability.
- **Choice:** Delete `.claude/rules/LEGAL_RULES.md`. Replace with `.claude/rules/HEALTH_RULES.md` covering: absolute prohibitions (no diagnosing, no self-harm encouragement), mandatory disclaimers, pain-feedback flow, pre-existing-condition gating, camera/pose privacy.
- **Why:** We enforce the risks that actually apply to an exercise product. Keeping unrelated legal rules would make the file noise and reduce review quality.
- **Consequence:** `security-check` skill now uses HEALTH_RULES. Any AI-generated routine (Phase 11+) must be reviewed against this file.

## D-004 — Opus-tier lead agents preserved, default model for subagents
- **Date:** 2026-04-18 (session 1)
- **Decided by:** architect
- **Context:** Creator OS's cost model splits leads (Opus) from implementation agents (default).
- **Choice:** Keep that split for bendro: `planner`, `architect`, `security-lead`, `pr-reviewer` run Opus. All others run the default/efficient tier. Dropped the `orchestration-lead` Opus slot because there is no orchestrator.
- **Why:** High-stakes decisions (architecture, security, PR approval) benefit from Opus quality. Implementation is routine enough that the default model is adequate.
- **Consequence:** Cost stays proportional to risk. Only 4 Opus roles in bendro vs. 5 in Creator OS.

---

## Format for New Entries

```
## D-NNN — One-line title
- **Date:** YYYY-MM-DD (session N)
- **Decided by:** agent(s)
- **Context:** 1–3 sentences on the problem
- **Choice:** what we picked
- **Why:** reasoning, trade-offs considered
- **Consequence:** what this forces in the code or in other agents' behavior
```
