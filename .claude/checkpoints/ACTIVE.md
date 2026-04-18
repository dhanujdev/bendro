# Active Checkpoint
Date: 2026-04-18
Session: 1 — Framework Port from Creator OS
Request: Use Creator OS methodology/framework to complete bendro; get a working, tested app deployable to Vercel.
Classified as: Multi-phase build-out, starting with foundation port.
Assigned to: architect (orchestrator)
Phase: 0 — Foundation & Framework Port

## Progress
- [x] Step 1: Clone bendro to ~/bendro
- [x] Step 2: Survey state (package.json, schema, file tree, commits)
- [x] Step 3: Mechanical copy of `.claude/` (agents, skills, hooks, commands, rules, scripts, context, settings.json)
- [x] Step 4: Write bendro-adapted `CLAUDE.md` (replaces `@AGENTS.md` stub; keeps AGENTS.md include at top)
- [x] Step 5: Rewrite `.claude/rules/SYSTEM_RULES.md` for bendro
- [x] Step 6: Rewrite `.claude/rules/ARCHITECTURE_RULES.md` for Next.js monolith
- [x] Step 7: Rewrite `.claude/rules/SECURITY_RULES.md` for NextAuth + Stripe + camera privacy
- [x] Step 8: Delete `.claude/rules/LEGAL_RULES.md` (replaced by HEALTH_RULES in next step)
- [ ] Step 9: Write `.claude/rules/HEALTH_RULES.md` (exercise/medical disclaimers) ← RESUME HERE
- [ ] Step 10: Prune agents that don't apply (orchestration-lead, policy-lead, data-lead → merge into backend-lead)
- [ ] Step 11: Prune skills that don't apply (langgraph-review, policy-check, cost-tracking-check, workflow-adapter-check, evaluation-run)
- [ ] Step 12: Adapt remaining agents to bendro stack (TS/Next.js full-stack, Drizzle, NextAuth, Stripe)
- [ ] Step 13: Adapt remaining skills to bendro domain
- [ ] Step 14: Adjust hooks for bendro (hooks are Python — keep, but update contract-guard/tdd-guard paths for src/app/api/**/route.ts)
- [ ] Step 15: Write `docs/AGENT_MEMORY.md`, `docs/SESSION_HANDOFF.md`, `docs/BLOCKERS.md`, `docs/DECISIONS.md`, `docs/CHANGELOG.md`, `docs/EXECUTION_LOG.md`
- [ ] Step 16: Write `docs/PHASES.md` (full phase breakdown matching CLAUDE.md §12)
- [ ] Step 17: Write `docs/PRD.md`, `docs/BACKLOG.md` (planner pass — can delegate)
- [ ] Step 18: Write `docs/STANDARDS.md` (TS/Next.js conventions)
- [ ] Step 19: Create initial ADRs (ADR-0001 architecture record, ADR-0002 data adapter, ADR-0003 pose solver boundary)
- [ ] Step 20: Scaffold `docs/specs/openapi/v1/bendro.yaml` from existing 6 API routes
- [ ] Step 21: Initial commit on bendro main
- [ ] Step 22: Move to Task #3 (planner pass) → Task #4 (execute phases)

## Files Modified (in bendro)
- `CLAUDE.md` — full rewrite as bendro master rules (keeps `@AGENTS.md` line 1)
- `.claude/rules/SYSTEM_RULES.md` — bendro-adapted system rules
- `.claude/rules/ARCHITECTURE_RULES.md` — Next.js monolith boundaries
- `.claude/rules/SECURITY_RULES.md` — NextAuth + Stripe + camera privacy
- `.claude/rules/LEGAL_RULES.md` — DELETED

## Files Copied Verbatim (in bendro/.claude/, still need adaptation)
- `.claude/agents/*` — 12 agents, still reference Creator OS
- `.claude/skills/*` — 18 skills, some don't apply
- `.claude/hooks/*.py` — 10 hooks, paths/patterns need bendro updates
- `.claude/commands/*.md` — 10 commands, some reference creatorOS phases
- `.claude/scripts/*` — phase orchestrator + security review + verify_compliance (Creator-OS specific)
- `.claude/context/` — phase_prompts.py + templates (Creator-OS specific)
- `.claude/settings.json` — may need path adjustments

## Tests Added/Modified
- None yet (port is docs/config only; no source code touched)

## Blockers
- None.

## Key Decisions Made
1. **Bendro is a Next.js 16 full-stack monolith**, not a microservice system. Many Creator OS patterns (orchestrator, policy engine, LangGraph, observability service, FastAPI) do NOT apply. Kept: BDD/TDD, contract-first, ADRs, service-layer business logic, data adapter boundary, single-module external SDK wrappers.
2. **LEGAL_RULES.md → HEALTH_RULES.md**: Bendro's legal risk is injury/medical-advice liability, not AI-generated content harm. Replaced the Creator OS legal rules with exercise-specific health/safety rules.
3. **Phase model redesigned** for bendro: 16 phases (0–15) ending at Vercel deploy. See CLAUDE.md §12.
4. **Port scope**: Full port of `.claude/` structure, but **adapt** domain-specific content rather than keeping creatorOS references. Drop agents/skills that have no bendro analog.

## Context for Next Session
- bendro is at `/Users/dhanujgumpella/bendro` (sibling of creatorOS).
- The user's original request: "use creator os to create bendro" → interpreted as "apply Creator OS's methodology/agent framework to finish bendro into a v1 Vercel-deployable app."
- Scope of target: working app, tested, hosted on Vercel. Not a simple fix.
- All four top-level tasks are tracked in TaskList (IDs 1–4). Task #1 complete. Task #2 in progress. Tasks #3 and #4 are the large bodies of work (planner pass + phase execution).
- Nothing has been committed in bendro yet since the port started. Untracked files: all of `.claude/`, rewritten CLAUDE.md, deleted LEGAL_RULES.md, new empty `docs/` + `tests/features/` dirs.

## Resume Instructions

Quick-start a new session:

1. `cd /Users/dhanujgumpella/bendro`
2. `claude --continue` (or `claude -r` and pick this session) — preserves the transcript if the terminal is the same.
3. If that fails (new machine, wiped transcripts): start a fresh session here and say:
   > "Read `.claude/checkpoints/ACTIVE.md` and resume the framework port for bendro from Step 9."

4. Step 9 is: write `.claude/rules/HEALTH_RULES.md` (exercise/medical disclaimers). Model it after the Creator OS LEGAL_RULES structure but replace the content with:
   - Mandatory disclaimers (not medical advice, consult healthcare provider, stop if pain)
   - Copyright rules around stretch descriptions (paraphrase, don't copy from sources)
   - Absolute prohibitions (no content encouraging self-harm; no diagnosing injuries)
   - Platform compliance (Apple HealthKit/Google Fit disclosures if integrated later)

5. Then work through Steps 10–22 in order. Steps 12, 13, 17 can be delegated to subagents (general-purpose or planner) with scoped prompts — the rest need direct file writes.

## Original Tasks
- #1 [completed] Clone bendro and survey state
- #2 [in_progress] Port `.claude/` framework to bendro
- #3 [pending] Planning pass: produce bendro phase plan + PRD
- #4 [pending] Execute phases to reach v1 shippable on Vercel
