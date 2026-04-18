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

## D-005 — Auth.js v5 with database sessions; see ADR-0004
- **Date:** 2026-04-18 (session 2, Phase 3)
- **Decided by:** security-lead, backend-lead
- **Context:** Phase 3 gate requires server-owned `userId`. Every mutation route currently reads userId from request body/query.
- **Choice:** Auth.js v5 (`next-auth@beta`) + Drizzle adapter + database session strategy. Providers: Resend magic link (primary) + Google OAuth (secondary). Extend existing `users` table with `name`, `emailVerified`, `image` rather than using Auth.js-owned user table.
- **Why:** DB sessions give free revocation, single source of truth for users, no password custody. Auth.js v5 is the App-Router-native version. See ADR-0004 for the full rationale and trade-offs.
- **Consequence:** `src/lib/auth.ts` is the sole `next-auth` importer (parallel to the `stripe` rule). `pre-pr-gate.py` Gate 4 will block any PR that reintroduces body-sourced userId. Three new tables (accounts, auth_sessions, verification_tokens) and three new columns on users.

## D-006 — NextAuth session table named `auth_sessions` to avoid collision
- **Date:** 2026-04-18 (session 2, Phase 3)
- **Decided by:** backend-lead
- **Context:** Bendro already has a `sessions` table for workout sessions. Auth.js Drizzle adapter defaults to a `session` (singular) table, which is both confusing and easy to swap by accident.
- **Choice:** Name the Auth.js sessions table `auth_sessions` (plural, prefixed) in DB and Drizzle export. Configure the adapter to use this table via `sessionsTable:` override.
- **Why:** Explicit naming prevents a Phase 8 bug where a query accidentally selects from the wrong `sessions` table. The cost — one line of adapter config — is trivial.
- **Consequence:** Every future reference to the NextAuth session table uses the `auth_sessions` name. Workout session code is unchanged.

## D-007 — Local Postgres via docker compose; Neon for preview + prod
- **Date:** 2026-04-18 (session 3, Phase 5)
- **Decided by:** backend-lead
- **Context:** Phase 5 hardens the mock ↔ DB toggle. The integration suite (Phase 14 target) needs a real Postgres to run against, and contributors need a way to exercise the Drizzle path locally without a Neon account.
- **Choice:** Ship `docker-compose.db.yml` with a vanilla Postgres 16 container. `pnpm db:local:up` / `down` / `reset` scripts wrap it. Neon stays the target for Vercel preview and production deployments.
- **Why:** Drizzle migrations work against vanilla Postgres 16 and Neon's serverless flavor interchangeably; the schema has no Neon-specific features yet. A local container gives parity testing without external dependencies. Reserving Neon for preview/prod keeps the preview-branch isolation benefit intact.
- **Consequence:** `docs/DB_TOGGLE.md` is the runbook. Future CI (Phase 15) can reuse the same compose file. Seed remains idempotent (`onConflictDoNothing`) so re-running against a shared local DB is safe.

## D-008 — Formalize `DataAdapter` interface in `src/lib/data.ts`
- **Date:** 2026-04-18 (session 3, Phase 5)
- **Decided by:** backend-lead
- **Context:** `src/lib/data.ts` exports loose functions. Adding a new operation was easy to forget to mirror; and tests that wanted to stub the entire data layer had to stub each export individually.
- **Choice:** Add an explicit `DataAdapter` interface (using `typeof` for each function) plus a `dataAdapter` object that satisfies it. Existing named exports continue to work; callers choose between named imports and `dataAdapter` based on need.
- **Why:** The `typeof` approach gives a compile-time contract without duplicating type definitions. Tests can `vi.mock("@/lib/data", ...)` to swap the adapter. Future CI integration-test variants (fully mocked Neon client) swap in behind the same shape.
- **Consequence:** Adding a new operation requires updating both the function and the `DataAdapter` interface — the compiler catches drift. Also extracted `isFallbackError` / `shortReason` to `src/lib/data-fallback.ts` so the classifier is unit-tested independently (11 new tests).

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
