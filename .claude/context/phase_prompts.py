"""Per-phase agent prompt templates for the autonomous phase orchestrator.

Each phase has:
  - primary_prompt(phase_num, state): sent to the lead/primary agent
  - secondary_prompt(phase_num, state, primary_output): sent to the secondary agent (SEQUENTIAL phases only)
  - qa_prompt(phase_num, state): sent to qa-lead
  - pr_prompt(phase_num, state): sent to pr-reviewer

The FEEDBACK_BLOCK is automatically appended to implementation prompts on iteration 2+.

Usage:
    from phase_prompts import build_prompt
    prompt = build_prompt("primary", phase_num=13, state=state)
"""
from __future__ import annotations

import textwrap
from typing import Any


# ---------------------------------------------------------------------------
# Prompt builder entry point
# ---------------------------------------------------------------------------


def build_prompt(
    role: str,
    phase_num: int,
    state: dict[str, Any],
    primary_output: str = "",
) -> str:
    """Build the full prompt for a given role and phase.

    Args:
        role: One of "primary", "secondary", "qa", "pr".
        phase_num: Phase number (13–21).
        state: Current orchestration state dict (contains iteration, feedback history, etc.).
        primary_output: Output from the primary agent (for SEQUENTIAL phases only).

    Returns:
        Full prompt string ready to pass to invoke_agent().
    """
    builders = {
        "primary": _primary_prompts,
        "secondary": _secondary_prompts,
        "qa": _qa_prompt,
        "pr": _pr_prompt,
    }
    if role not in builders:
        raise ValueError(f"Unknown role: {role}. Must be one of: {list(builders)}")
    if role in ("primary", "secondary"):
        return builders[role](phase_num, state, primary_output)
    return builders[role](phase_num, state)


# ---------------------------------------------------------------------------
# Shared blocks
# ---------------------------------------------------------------------------


def _feedback_block(state: dict[str, Any]) -> str:
    """Return the feedback injection block for iteration 2+ prompts."""
    iteration = state.get("iteration", 1)
    if iteration <= 1:
        return ""
    history = state.get("implement_feedback_history", [])
    qa_feedback = state.get("qa_feedback", "")
    review_feedback = state.get("review_feedback", "")
    lines = [
        "",
        "=" * 60,
        f"FEEDBACK FROM PREVIOUS ITERATIONS (iteration {iteration - 1} review)",
        "=" * 60,
        "",
        "You are on ITERATION {} of max 3. Previous attempts did not pass review.".format(iteration),
        "You MUST address ALL items below before outputting IMPLEMENTATION_COMPLETE.",
        "",
    ]
    if qa_feedback:
        lines += ["## QA Feedback", qa_feedback, ""]
    if review_feedback:
        lines += ["## PR Reviewer Feedback", review_feedback, ""]
    if history:
        lines += ["## Full Feedback History (all iterations)"]
        for i, fb in enumerate(history, 1):
            lines += [f"### Iteration {i}", fb, ""]
    lines += [
        "ADDRESS EVERY ITEM ABOVE. Do not re-implement from scratch — make targeted fixes.",
        "=" * 60,
    ]
    return "\n".join(lines)


def _common_constraints() -> str:
    """Architecture invariants included in every implementation prompt."""
    return textwrap.dedent("""
    ## ARCHITECTURE INVARIANTS (violations = BLOCKED PR)

    - LangGraph ONLY in services/orchestrator/ — never in services/api/ or packages/
    - LLM calls ONLY through services/orchestrator/providers/model_router.py
    - Audit events ONLY via packages/observability EventEmitter (never direct DB writes)
    - Policy resolution ONLY in packages/policy-engine
    - DB access ONLY through Repository classes — no raw ORM calls in routes or services
    - Business logic ONLY in service layer — route handlers are thin (call service, return response)
    - workspace_id filter on EVERY query on tenant-scoped tables — no exceptions
    - All inputs validated with Pydantic at boundaries
    - No PII, tokens, or secrets in logs
    """).strip()


# ---------------------------------------------------------------------------
# QA prompt (shared across all phases)
# ---------------------------------------------------------------------------


def _qa_prompt(phase_num: int, state: dict[str, Any]) -> str:
    """Build the qa-lead validation prompt for any phase."""
    phase_name = _PHASE_NAMES[phase_num]
    branch = state.get("phase_git_branch", f"feat/phase-{phase_num}")
    iteration = state.get("iteration", 1)
    deviations = state.get("detected_deviations", [])
    prev_qa = state.get("qa_feedback", "")

    deviation_block = ""
    if deviations:
        deviation_block = "\n## DEVIATIONS DETECTED BY ORCHESTRATOR\n"
        for d in deviations:
            deviation_block += f"- {d['type']}: expected {d['expected']}, got {d['actual']}\n"
        deviation_block += "\nPlease verify whether each deviation is architecturally acceptable.\n"

    retry_block = ""
    if iteration > 1 and prev_qa:
        retry_block = f"\n## PREVIOUS QA FINDINGS (iteration {iteration - 1})\n{prev_qa}\n\nVerify these are now resolved.\n"

    return textwrap.dedent(f"""
    You are the qa-lead for Creator OS.

    ## CONTEXT
    You are validating Phase {phase_num}: {phase_name}, iteration {iteration}/3.
    Branch to validate: {branch}
    Working directory: /Users/dhanujgumpella/creatorOS

    ## SESSION START
    1. Read CLAUDE.md
    2. Read docs/AGENT_MEMORY.md

    ## VALIDATION CHECKLIST

    ### 1. Unit Tests
    Run and confirm all pass:
    ```bash
    cd /Users/dhanujgumpella/creatorOS
    python3 -m pytest tests/unit/python/ -q --tb=short 2>&1 | tail -20
    ```
    Expected: all tests pass (no failures). Coverage drop is a warning, not a block.

    ### 2. Coverage on New Files
    Run coverage on files added/modified in this phase:
    ```bash
    git diff main...HEAD --name-only | grep "\.py$" | grep -v test | head -20
    ```
    For each new Python file in services/ or packages/:
    ```bash
    python3 -m pytest tests/unit/python/ --cov=services --cov=packages --cov-report=term-missing -q 2>&1 | tail -10
    ```
    Required: ≥85% on business logic files, ≥90% on LangGraph node files.

    ### 3. BDD Feature Files
    Check that .feature files exist for Phase {phase_num} behavior:
    ```bash
    find tests/features/ -name "*.feature" -newer docs/AGENT_MEMORY.md | head -20
    ```
    Required: at least 1 new .feature file with ≥3 scenarios (happy path, error, auth failure).

    ### 4. Architecture Violations
    ```bash
    # LangGraph imported outside orchestrator?
    grep -r "from langgraph\|import langgraph" services/api/ packages/ apps/ 2>/dev/null

    # Direct LLM SDK calls outside model_router?
    grep -r "anthropic\.Anthropic\|openai\.OpenAI\|client\.messages" services/api/ packages/ apps/ 2>/dev/null

    # F-string SQL injection vectors?
    grep -rn "text(f\"" services/ packages/ 2>/dev/null

    # Missing workspace_id in new repository files?
    git diff main...HEAD -- "services/*/src/repositories/*.py" | grep "^+" | grep -i "SELECT\|UPDATE\|DELETE" | grep -iv "workspace"
    ```
    Any hits = QA_VERDICT: FAIL.

    ### 5. New Files Documented
    ```bash
    git diff main...HEAD --name-only | grep "\.py$" | grep -v test | head -20
    ```
    For each new Python file: spot-check that public functions have docstrings.
    ```bash
    python3 -m py_compile {{each_new_file}}  # no syntax errors
    ```

    ### 6. OpenAPI Spec Exists
    ```bash
    ls docs/specs/openapi/v1/ | sort
    ```
    Confirm a new spec file exists for any new API endpoints added this phase.
    {deviation_block}
    {retry_block}

    ## OUTPUT FORMAT

    End your response with EXACTLY one of these blocks (no exceptions):

    If all checks pass:
    ```
    QA_VERDICT: PASS
    - Tests: {{N}} passed, 0 failed
    - Coverage: {{X}}% on new files
    - BDD: {{N}} scenarios in {{N}} feature files
    - Architecture checks: clean
    - Docs: all new public functions have docstrings
    ```

    If any check fails:
    ```
    QA_VERDICT: FAIL
    FAILURES:
    - [TESTS] {{describe what failed and file:line}}
    - [COVERAGE] {{which file is below threshold and current %}}
    - [ARCHITECTURE] {{exact violation found}}
    - [BDD] {{what scenario is missing}}
    - [DOCS] {{what is undocumented}}
    REQUIRED FIXES:
    1. {{specific fix with file path}}
    2. {{specific fix with file path}}
    ```

    If a security/architecture blocker is found:
    ```
    QA_VERDICT: BLOCKED
    BLOCKER: {{exact description}}
    FILE: {{file:line}}
    ```
    """).strip()


# ---------------------------------------------------------------------------
# PR review prompt (shared across all phases)
# ---------------------------------------------------------------------------


def _pr_prompt(phase_num: int, state: dict[str, Any]) -> str:
    """Build the pr-reviewer prompt for any phase."""
    phase_name = _PHASE_NAMES[phase_num]
    branch = state.get("phase_git_branch", f"feat/phase-{phase_num}")
    iteration = state.get("iteration", 1)

    return textwrap.dedent(f"""
    You are the pr-reviewer for Creator OS, running on claude-opus-4-6.

    ## CONTEXT
    Review Phase {phase_num}: {phase_name}, iteration {iteration}.
    Branch: {branch}
    Working directory: /Users/dhanujgumpella/creatorOS

    ## YOUR TASK
    Run your full 24-item PR review checklist from your agent definition.

    Start with:
    ```bash
    cd /Users/dhanujgumpella/creatorOS
    git diff main...{branch} --stat
    git log main...{branch} --oneline
    ```

    Then read every changed file (not just the diff) and run:
    - bandit on changed Python files
    - detect-secrets scan
    - grep checks for architecture violations

    ## OUTPUT FORMAT
    Follow your standard output format ending with EXACTLY:
    ```
    Verdict: APPROVED
    ```
    or:
    ```
    Verdict: CHANGES REQUESTED
    ```
    or:
    ```
    Verdict: BLOCKED
    ```

    The verdict token MUST be on its own line at the end, prefixed with "Verdict: ".
    This is machine-parsed by the orchestrator.
    """).strip()


# ---------------------------------------------------------------------------
# Phase 13: Content Moderation
# ---------------------------------------------------------------------------


def _phase13_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the security-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    You are leading Phase 13: Content Moderation (primary implementation).
    Phases 0–12 are complete and tagged. Phase 12 delivered auth hardening, RBAC on all routes,
    rate limiting, security headers, and CORS hardening.

    The policy engine (Phase 3) is live in packages/policy-engine.
    The orchestrator (Phase 4) runs content_strategy_v1 end-to-end.
    workspace policy has: contentModerationLevel (DEFAULT|STRICT|CUSTOM), customBlockedCategories[].

    ## YOUR GOAL
    Implement content moderation gates:
    1. GATE 1: User-submitted goals/prompts are moderated before workflow processing begins
    2. GATE 2: AI-generated artifacts are moderated before delivery to the user
    3. Moderation integrates with workspace policy (owner-configurable blocked categories)
    4. On violation: workflow halts, content_moderation_triggered audit event emitted

    ## REQUIRED SEQUENCE (follow exactly — do not skip steps)

    Step 1: Read CLAUDE.md, docs/AGENT_MEMORY.md
    Step 2: Invoke contract-first skill
            Write: docs/specs/openapi/v1/moderation.yaml
            Endpoints: GET /workspaces/{{id}}/moderation-status
            Commit: "docs(contracts): Phase 13 content moderation OpenAPI spec"
    Step 3: Invoke bdd-scenario-write skill
            File: tests/features/policies/content_moderation.feature
            Scenarios required: goal passes moderation, goal blocked by policy,
            artifact blocked, custom category trigger, STRICT level override,
            workspace policy respected, auth failure (403)
            Commit failing step stubs before implementation
    Step 4: Invoke security-check skill
    Step 5: Implement (TDD GREEN — make your failing tests pass):
            packages/policy-engine/src/moderation.py
              class ContentModerator:
                moderate_goal(goal, policy) -> ModerationResult
                moderate_artifact(artifact_dict, policy) -> ModerationResult
                _check_blocked_categories(text, categories) -> list[str]
              dataclass ModerationResult: allowed: bool, reason: str | None, categories_triggered: list[str]
            services/api/src/services/moderation_service.py
              class ModerationService:
                check_goal(workspace_id, goal, db_session) -> ModerationResult
                check_artifact(workspace_id, artifact, db_session) -> ModerationResult
    Step 6: Wire into content_strategy_v1 graph: goal_moderation check at run start
            File: services/orchestrator/src/nodes/moderation_node.py (will be wired by orchestration-lead)
            Just implement the node function for orchestration-lead to connect
    Step 7: Emit audit event on moderation trigger via packages/observability EventEmitter
            Event type: content_moderation_triggered
            Payload: {{workspace_id, goal_hash (SHA-256, not raw text), categories_triggered, decision}}
    Step 8: Invoke security-scan skill — zero high/critical findings required
    Step 9: Invoke policy-check skill
    Step 10: Run: python3 -m pytest tests/unit/python/ -q
    Step 11: Commit all work

    ## DELIVERABLES
    - packages/policy-engine/src/moderation.py (new)
    - services/api/src/services/moderation_service.py (new)
    - services/orchestrator/src/nodes/moderation_node.py (new — node function stub for orchestration-lead)
    - docs/specs/openapi/v1/moderation.yaml (new)
    - tests/features/policies/content_moderation.feature (new, ≥7 scenarios)
    - tests/unit/python/test_content_moderation.py (new, ≥12 unit tests)

    {_common_constraints()}

    ## IMPORTANT
    - Do NOT call Anthropic LLM for basic keyword matching — use deterministic rules for DEFAULT level
    - For STRICT level: use model_router.py to call claude-haiku-4-5 as LLM judge
    - ModerationResult must never include the raw blocked text in logs
    - SHA-256 hash the goal before logging (protect PII)

    ## EXIT SIGNAL
    When complete, output EXACTLY on its own line:
    IMPLEMENTATION_COMPLETE: Phase 13 security-lead done.
    {_feedback_block(state)}
    """).strip()


def _phase13_secondary(state: dict[str, Any], primary_output: str) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    You are completing Phase 13: Content Moderation (graph wiring).
    The security-lead has completed the primary implementation. Here is their summary:

    --- SECURITY-LEAD OUTPUT (last 2000 chars) ---
    {primary_output[-2000:] if len(primary_output) > 2000 else primary_output}
    --- END ---

    ## YOUR GOAL
    Wire the moderation nodes into the content_strategy_v1 LangGraph graph.

    ## REQUIRED SEQUENCE
    Step 1: Read docs/specs/LANGGRAPH_WORKFLOW_V1.md and docs/ADR/0004-langgraph-orchestration.md
    Step 2: Read services/orchestrator/src/graphs/content_strategy_v1.py (read entire file)
    Step 3: Read services/orchestrator/src/nodes/moderation_node.py (just created by security-lead)
    Step 4: Invoke langgraph-review skill
    Step 5: Modify content_strategy_v1.py:
            - Import and add goal_moderation_node to graph AFTER ingest_goal_node
            - Add conditional edge: moderation BLOCKED → set status="blocked_by_moderation", go to END
            - Add artifact_moderation_node call after each artifact-generating node
    Step 6: Update state model if moderation_result field is missing:
            File: services/orchestrator/src/state/content_strategy_state.py (or equivalent)
            Add: moderation_result: dict | None = None
    Step 7: Write/update integration test for the moderated graph path
    Step 8: Invoke architecture-diagram-update skill
            Update: docs/architecture/workflow-graph.md (add moderation nodes to flow)
    Step 9: Run: python3 -m pytest tests/unit/python/ -q
    Step 10: Commit: "feat(orchestrator): Phase 13 — wire content moderation into content_strategy_v1 graph"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 13 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 14: Evaluation & Quality Gates
# ---------------------------------------------------------------------------


def _phase14_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the qa-lead for Creator OS.

    ## PHASE CONTEXT
    Phase 14: Evaluation & Quality Gates.
    Phase 8 established LangSmith integration. Phase 13 added content moderation.
    Goal: make evaluation a first-class CI gate — not just a manual check.

    ## YOUR GOAL
    1. Ensure LangSmith dataset creator-os-v1-golden has ≥25 golden examples
    2. Implement/update the evaluation runner script with pass/fail thresholds
    3. Wire evaluation into the CI make target: make eval-run
    4. Verify Phase 13 new code meets ≥85% coverage

    ## REQUIRED SEQUENCE
    Step 1: Read docs/AGENT_MEMORY.md and docs/specs/BDD_STRATEGY.md
    Step 2: Check evaluation dataset
            If services/orchestrator/scripts/run_evaluation.py exists — read it
            If services/orchestrator/scripts/add_eval_example.py exists — read it
    Step 3: Add golden examples until dataset has ≥25
            Each example: {{input: {{goal, brand_voice, channels}}, expected_output: {{brief_structure, strategy_outline}}, metadata: {{workflow_type, difficulty}}}}
    Step 4: Implement/update services/orchestrator/scripts/run_evaluation.py
            Hard thresholds: structure_completeness ≥ 95%, quality_score ≥ 0.75, policy_compliance = 100%
            Exit code 0 on PASS, exit code 1 on FAIL
    Step 5: Verify coverage on Phase 13 new files
            Run: python3 -m pytest tests/unit/python/ --cov=packages/policy-engine/src/moderation -q
            Run: python3 -m pytest tests/unit/python/ --cov=services/orchestrator/src/nodes/moderation_node -q
            If below 85%: add the missing tests now
    Step 6: Write/update tests/features/admin/evaluation.feature
            Scenarios: evaluation passes at threshold, evaluation fails below threshold,
            policy_compliance failure blocks run, CI gate invokes correctly
    Step 7: Update Makefile target eval-run (if Makefile exists):
            eval-run: python3 services/orchestrator/scripts/run_evaluation.py
    Step 8: Commit: "feat(qa): Phase 14 — evaluation pipeline and CI quality gates"

    ## DELIVERABLES
    - services/orchestrator/scripts/run_evaluation.py (updated with hard thresholds)
    - services/orchestrator/scripts/eval_examples/ (≥25 golden examples as JSON)
    - tests/features/admin/evaluation.feature (new/updated)
    - Coverage on Phase 13 files: ≥85%

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 14 qa-lead done.
    {_feedback_block(state)}
    """).strip()


def _phase14_secondary(state: dict[str, Any], primary_output: str) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 14: Evaluation & Quality Gates (orchestrator integration).
    The qa-lead has set up the evaluation pipeline. Summary:
    --- QA-LEAD OUTPUT ---
    {primary_output[-1500:] if len(primary_output) > 1500 else primary_output}
    --- END ---

    ## YOUR GOAL
    Integrate the evaluation gate as Layer 3 (evaluator) in the 3-layer validator pipeline.

    ## REQUIRED SEQUENCE
    Step 1: Read services/orchestrator/src/validators/ directory (all files)
    Step 2: Read docs/specs/VALIDATOR_ARCHITECTURE.md
    Step 3: Invoke langgraph-review skill
    Step 4: Update services/orchestrator/src/validators/evaluator/ to use run_evaluation.py as backing
            Ensure evaluator node thresholds match: structure_completeness ≥ 95%, quality_score ≥ 0.75
    Step 5: Add integration test: full 3-layer validation blocks when evaluator threshold not met
    Step 6: Verify the evaluator node does NOT call LLM directly — uses run_evaluation.py script
    Step 7: Commit: "feat(orchestrator): Phase 14 — wire LangSmith evaluator as Layer 3 validator"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 14 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 15: Video Pipeline
# ---------------------------------------------------------------------------


def _phase15_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the devops-lead for Creator OS.

    ## PHASE CONTEXT
    Phase 15: Video Pipeline (Media Ingestion).
    MinIO is running at localhost:9000 (credentials: minioadmin/minioadmin).
    The orchestrator runs content_strategy_v1 end-to-end.
    Goal: add media upload → transcode → store → metadata extraction pipeline.

    ## YOUR GOAL
    - Pre-signed URL upload flow for large video files (no streaming through API)
    - Inngest background job for transcoding
    - Metadata extraction (duration, resolution, codec) stored with the artifact
    - TranscoderAdapter interface (swappable between local ffmpeg and cloud)

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, docs/AGENT_MEMORY.md
    Step 2: Invoke contract-first skill
            File: docs/specs/openapi/v1/media_uploads.yaml
            Endpoints: POST /workspaces/{{id}}/uploads/presigned-url, GET /workspaces/{{id}}/uploads/{{id}}/status
            Commit spec first
    Step 3: Invoke bdd-scenario-write skill
            File: tests/features/artifacts/media_upload.feature
            Scenarios: successful upload completes, file too large (>50MB) rejected,
            unsupported format rejected, transcoding failure handled, auth failure
    Step 4: Implement (follow Repository → Service → Route order):
            services/api/src/repositories/upload_repository.py
            services/api/src/services/upload_service.py
            services/api/src/routes/uploads.py
            packages/shared/src/adapters/transcoder_adapter.py (TranscoderAdapter Protocol + LocalFfmpegAdapter)
            services/workers/src/jobs/transcode_media.py (Inngest job definition)
    Step 5: Update docker-compose.yml to verify MinIO bucket for video assets exists
            Do NOT replace or break existing postgres/minio services
    Step 6: Write unit tests — mock MinIO calls (do not call real MinIO in unit tests)
    Step 7: Run: python3 -m pytest tests/unit/python/ -q
    Step 8: Commit: "feat(api): Phase 15 — video pipeline with pre-signed upload and transcoding"

    ## DELIVERABLES
    - services/api/src/repositories/upload_repository.py (new)
    - services/api/src/services/upload_service.py (new)
    - services/api/src/routes/uploads.py (new)
    - packages/shared/src/adapters/transcoder_adapter.py (new)
    - services/workers/src/jobs/transcode_media.py (new)
    - docs/specs/openapi/v1/media_uploads.yaml (new)
    - tests/features/artifacts/media_upload.feature (new, ≥5 scenarios)

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 15 devops-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 16: Content Packaging
# ---------------------------------------------------------------------------


def _phase16_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 16: Content Packaging.
    Phase 15 added video asset handling. The orchestrator produces content_strategy artifacts.
    Goal: bundle workflow outputs into deliverable ContentPackage (JSON manifest + assets + metadata).

    ## YOUR GOAL
    - New LangGraph workflow: content_packaging_v1
    - Takes workflow_run_id, bundles all its artifacts into a ContentPackage
    - Output formats: JSON manifest, optionally a ZIP with assets
    - Full 3-layer validation before delivering the package
    - Cost-tracked for any LLM calls in the packaging stage

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, docs/specs/LANGGRAPH_WORKFLOW_V1.md, docs/ADR/0004
    Step 2: Invoke contract-first skill
            File: docs/specs/workflows/content_packaging_v1.md (workflow spec)
            File: docs/specs/openapi/v1/content_packages.yaml (API spec)
    Step 3: Invoke bdd-scenario-write skill
            File: tests/features/artifacts/content_packaging.feature
            Scenarios: package created from completed run, validation fails on incomplete run,
            ZIP download works, moderation blocks package, auth failure
    Step 4: Invoke langgraph-review skill BEFORE implementing the graph
    Step 5: Invoke cost-tracking-check skill BEFORE any LLM call in packaging
    Step 6: Implement:
            services/orchestrator/src/state/packaging_state.py (PackagingState TypedDict)
            services/orchestrator/src/nodes/packaging_nodes.py (assemble_package, validate_package, generate_manifest)
            services/orchestrator/src/graphs/content_packaging_v1.py (compiled graph)
            services/api/src/repositories/package_repository.py
            services/api/src/services/package_service.py
            services/api/src/routes/packages.py
    Step 7: Register content_packaging_v1 in services/orchestrator/src/graphs/registry.py
    Step 8: Invoke architecture-diagram-update skill (update workflow-graph.md with new graph)
    Step 9: Run: python3 -m pytest tests/unit/python/ -q
    Step 10: Commit: "feat(orchestrator): Phase 16 — content packaging workflow and API"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 16 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 17: Publishing Workflow
# ---------------------------------------------------------------------------


def _phase17_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the backend-lead for Creator OS.

    ## PHASE CONTEXT
    Phase 17: Publishing Workflow (backend API layer).
    Content packages exist from Phase 16. Goal: schedule and execute publishing to external channels.
    Supported channels: LinkedIn, Instagram, Twitter/X, blog CMS (stub adapters — no real API calls).

    ## YOUR GOAL (backend layer only — orchestration-lead handles the graph)
    - PublishingRequest domain model and Prisma schema
    - PublisherAdapter protocol in packages/shared
    - Channel adapter stubs (interface only — no real SDK calls)
    - REST API endpoints for schedule/cancel/status
    - Inngest background job for async execution

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, docs/AGENT_MEMORY.md, packages/db/prisma/schema.prisma
    Step 2: Invoke db-migration-review skill
            New tables: publishing_requests, publishing_channel_configs
            All must have workspaceId column
    Step 3: Invoke contract-first skill
            File: docs/specs/openapi/v1/publishing.yaml
            Endpoints: POST /workspaces/{{id}}/publish-requests, GET status, DELETE cancel
    Step 4: Invoke bdd-scenario-write skill
            File: tests/features/workflows/publishing.feature
            Scenarios: schedule succeeds, cancel pending request, get status, channel adapter fails,
            auth failure, cross-tenant isolation
    Step 5: Implement (Repository → Service → Route):
            services/api/src/repositories/publishing_repository.py
            services/api/src/services/publishing_service.py
            services/api/src/routes/publishing.py
            packages/shared/src/adapters/publisher_adapter.py (PublisherAdapter Protocol)
            packages/shared/src/adapters/channel_adapters.py (LinkedIn/Instagram/Twitter stubs)
            services/workers/src/jobs/execute_publish.py (Inngest job)
    Step 6: No real API calls — all channel adapters are stubs returning success
    Step 7: Run: python3 -m pytest tests/unit/python/ -q
    Step 8: Commit: "feat(api): Phase 17 — publishing workflow API and channel adapter stubs"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 17 backend-lead done.
    {_feedback_block(state)}
    """).strip()


def _phase17_secondary(state: dict[str, Any], primary_output: str) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 17: Publishing Workflow (orchestrator graph).
    The backend-lead has built the API layer. Summary:
    --- BACKEND-LEAD OUTPUT ---
    {primary_output[-1500:] if len(primary_output) > 1500 else primary_output}
    --- END ---

    ## YOUR GOAL
    Build publishing_workflow_v1 LangGraph graph.

    ## REQUIRED SEQUENCE
    Step 1: Invoke langgraph-review skill
    Step 2: Read packages/shared/src/adapters/publisher_adapter.py (just created)
    Step 3: Implement:
            services/orchestrator/src/state/publishing_state.py
            services/orchestrator/src/nodes/publishing_nodes.py
              validate_package_node, route_to_channels_node, publish_to_channel_node, handle_publish_failure_node
            services/orchestrator/src/graphs/publishing_workflow_v1.py
    Step 4: Register in registry.py
    Step 5: The graph MUST use PublisherAdapter (from packages/shared) — no direct channel SDK calls
    Step 6: Invoke architecture-diagram-update skill
    Step 7: Commit: "feat(orchestrator): Phase 17 — publishing workflow graph"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 17 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 18: Analytics Ingestion
# ---------------------------------------------------------------------------


def _phase18_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the backend-lead for Creator OS.

    ## PHASE CONTEXT
    Phase 18: Analytics Ingestion.
    Phase 17 added publishing. Goal: ingest performance metrics back from publishing platforms
    and store them for reporting (views, engagement, clicks, etc.).

    ## YOUR GOAL
    - analytics_events table in Prisma schema (workspace-scoped)
    - Webhook endpoint to receive analytics events from external platforms
    - API endpoint to query analytics for a workspace
    - Background job to poll analytics APIs (Inngest, scheduled)

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, packages/db/prisma/schema.prisma
    Step 2: Invoke db-migration-review skill
            New table: analytics_events (workspaceId, platform, metricType, value, recordedAt, publishingRequestId FK)
    Step 3: Invoke contract-first skill
            File: docs/specs/openapi/v1/analytics.yaml
            Endpoints: POST /webhooks/analytics (platform webhook), GET /workspaces/{{id}}/analytics
    Step 4: Invoke bdd-scenario-write skill
            File: tests/features/admin/analytics.feature
    Step 5: Implement:
            services/api/src/repositories/analytics_repository.py
            services/api/src/services/analytics_service.py
            services/api/src/routes/analytics.py (GET analytics + POST webhook)
            services/workers/src/jobs/poll_analytics.py (Inngest scheduled job)
    Step 6: Webhook endpoint must validate a shared HMAC secret (not JWT — external caller)
            Secret from env var: ANALYTICS_WEBHOOK_SECRET
    Step 7: Run: python3 -m pytest tests/unit/python/ -q
    Step 8: Commit: "feat(api): Phase 18 — analytics ingestion and reporting"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 18 backend-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 19: Self-Learning & Recommendations
# ---------------------------------------------------------------------------


def _phase19_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 19: Self-Learning & Recommendations.
    Analytics data exists from Phase 18. pgvector is available (packages/db schema has it enabled).
    Goal: content performance feedback loop and workspace-specific recommendations.

    ## YOUR GOAL
    - Embed generated content using claude embedding API via model_router
    - Store embeddings in pgvector column on generated_artifacts
    - Recommendation engine: find similar high-performing content for a workspace
    - Feedback loop: high-performing artifacts boost future goal generation context

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, docs/AGENT_MEMORY.md, packages/db/prisma/schema.prisma
    Step 2: Invoke langgraph-review skill
    Step 3: Invoke cost-tracking-check skill — embedding calls must be cost-tracked
    Step 4: Invoke db-migration-review skill
            Alter: generated_artifacts — add embedding vector(1536) column (nullable)
            New table: content_performance_cache (workspaceId, artifactId, performanceScore, updatedAt)
    Step 5: Invoke contract-first skill
            File: docs/specs/openapi/v1/recommendations.yaml
            Endpoints: GET /workspaces/{{id}}/recommendations?goal=...
    Step 6: Implement:
            services/orchestrator/src/nodes/embed_artifact_node.py
              — embeds artifact content, stores in pgvector via repository
            services/orchestrator/src/nodes/retrieve_similar_node.py
              — cosine similarity search via pgvector, injects top-3 examples into goal context
            services/api/src/repositories/recommendations_repository.py
            services/api/src/services/recommendations_service.py
            services/api/src/routes/recommendations.py
    Step 7: Wire embed_artifact_node at end of content_strategy_v1 graph (after artifact delivery)
    Step 8: Wire retrieve_similar_node at start of graph (before strategy generation, after moderation)
    Step 9: Invoke architecture-diagram-update skill
    Step 10: Commit: "feat(orchestrator): Phase 19 — self-learning via pgvector and recommendation engine"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 19 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 20: CI/CD & Environment Promotion
# ---------------------------------------------------------------------------


def _phase20_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the devops-lead for Creator OS.

    ## PHASE CONTEXT
    Phase 20: CI/CD & Environment Promotion.
    All application phases (13-19) are complete. Goal: production-grade CI/CD pipeline.

    ## YOUR GOAL
    - GitHub Actions CI pipeline (3 workflows: ci.yml, pr-review.yml, security-advisory.yml)
    - Dockerfiles for services/api and services/orchestrator
    - docker-compose.yml extended with Redis (token revocation) and test variants
    - Staging promotion gate: all tests + evaluation pass before promoting
    - Environment config management (.env.example complete, no secrets)

    ## REQUIRED SEQUENCE
    Step 1: Read CLAUDE.md, .github/workflows/ (if any exist), docker-compose.yml
    Step 2: Write Dockerfiles:
            infra/docker/Dockerfile.api (multi-stage: builder → runtime, Python 3.11-slim)
            infra/docker/Dockerfile.orchestrator
    Step 3: Extend docker-compose.yml (do NOT replace — extend):
            Add: redis service (redis:7-alpine, port 6379)
    Step 4: Write .github/workflows/ci.yml
            Jobs: validate (lint+typecheck), security (bandit+semgrep+detect-secrets), test-unit, test-bdd
            All jobs run in parallel where possible
    Step 5: Write .github/workflows/pr-review.yml
            Trigger: PR opened/synchronized
            Jobs: automated checks + structured PR checklist status comment
    Step 6: Write .github/workflows/security-advisory.yml
            Trigger: scheduled daily
            Jobs: pnpm audit + pip-audit + detect-secrets + Trivy container scan
    Step 7: Update Makefile with all targets (if Makefile exists — extend it)
    Step 8: Verify .env.example has all required env vars documented with descriptions
    Step 9: Commit: "feat(infra): Phase 20 — CI/CD pipeline, Dockerfiles, security advisory workflow"

    ## IMPORTANT: Do NOT push to GitHub — commits stay local

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 20 devops-lead done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Phase 21: Workflow Catalog Expansion
# ---------------------------------------------------------------------------


def _phase21_primary(state: dict[str, Any]) -> str:
    return textwrap.dedent(f"""
    You are the orchestration-lead for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 21: Workflow Catalog Expansion.
    content_strategy_v1 is live. Goal: add 2 new workflow types to the catalog.

    ## YOUR GOAL
    Add two new workflow types (beyond content_strategy_v1):
    1. social_calendar_v1 — generate a 30-day social media calendar from a brand brief
    2. blog_series_v1 — generate a 5-part blog series outline with SEO optimization

    Each new workflow must follow the EXACT same architecture as content_strategy_v1:
    - Full LangGraph graph with all nodes
    - 3-layer validator pipeline
    - Approval interrupt support
    - Cost tracking
    - LangSmith evaluation examples (≥10 per workflow)
    - Full API wiring (registered in registry.py)

    ## REQUIRED SEQUENCE
    Step 1: Read services/orchestrator/src/graphs/content_strategy_v1.py (use as template)
    Step 2: Invoke langgraph-review skill for both new workflows
    Step 3: Invoke cost-tracking-check skill for both
    Step 4: For social_calendar_v1:
            services/orchestrator/src/state/social_calendar_state.py
            services/orchestrator/src/nodes/social_calendar_nodes.py
            services/orchestrator/src/graphs/social_calendar_v1.py
    Step 5: For blog_series_v1:
            services/orchestrator/src/state/blog_series_state.py
            services/orchestrator/src/nodes/blog_series_nodes.py
            services/orchestrator/src/graphs/blog_series_v1.py
    Step 6: Register both in registry.py
    Step 7: Update apps/web to show all 3 workflow types in the dropdown
    Step 8: Add ≥10 LangSmith golden examples for each new workflow
    Step 9: Invoke architecture-diagram-update skill
    Step 10: Commit: "feat(orchestrator): Phase 21 — social_calendar_v1 and blog_series_v1 workflows"

    {_common_constraints()}

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 21 orchestration-lead done.
    {_feedback_block(state)}
    """).strip()


def _phase21_secondary(state: dict[str, Any], primary_output: str) -> str:
    return textwrap.dedent(f"""
    You are the planner for Creator OS, running on claude-opus-4-6.

    ## PHASE CONTEXT
    Phase 21: Workflow Catalog Expansion — documentation and discovery layer.
    The orchestration-lead has built the two new workflows. Summary:
    --- ORCHESTRATION-LEAD OUTPUT ---
    {primary_output[-1500:] if len(primary_output) > 1500 else primary_output}
    --- END ---

    ## YOUR GOAL
    Create the workflow catalog documentation and in-app discovery layer.

    ## REQUIRED SEQUENCE
    Step 1: Read docs/specs/LANGGRAPH_WORKFLOW_V1.md (as template)
    Step 2: Write docs/specs/workflows/social_calendar_v1.md (full workflow spec)
    Step 3: Write docs/specs/workflows/blog_series_v1.md (full workflow spec)
    Step 4: Update docs/specs/API_CONTRACTS.md to list all 3 workflow types
    Step 5: Update CHANGELOG.md ## [Unreleased] with all Phase 21 additions
    Step 6: Update docs/AGENT_MEMORY.md — phase complete, all 21 phases done
    Step 7: Write docs/WORKFLOW_CATALOG.md — human-readable guide to all available workflows
    Step 8: Commit: "docs: Phase 21 — workflow catalog documentation and discovery"

    ## EXIT SIGNAL
    IMPLEMENTATION_COMPLETE: Phase 21 planner done.
    {_feedback_block(state)}
    """).strip()


# ---------------------------------------------------------------------------
# Dispatch tables
# ---------------------------------------------------------------------------


_PHASE_NAMES: dict[int, str] = {
    13: "Content Moderation",
    14: "Evaluation & Quality Gates",
    15: "Video Pipeline",
    16: "Content Packaging",
    17: "Publishing Workflow",
    18: "Analytics Ingestion",
    19: "Self-Learning & Recommendations",
    20: "CI/CD & Environment Promotion",
    21: "Workflow Catalog Expansion",
}

_PRIMARY_BUILDERS = {
    13: _phase13_primary,
    14: _phase14_primary,
    15: _phase15_primary,
    16: _phase16_primary,
    17: _phase17_primary,
    18: _phase18_primary,
    19: _phase19_primary,
    20: _phase20_primary,
    21: _phase21_primary,
}

_SECONDARY_BUILDERS = {
    13: _phase13_secondary,
    14: _phase14_secondary,
    17: _phase17_secondary,
    21: _phase21_secondary,
}


def _primary_prompts(phase_num: int, state: dict[str, Any], _: str) -> str:
    builder = _PRIMARY_BUILDERS.get(phase_num)
    if not builder:
        raise ValueError(f"No primary prompt defined for phase {phase_num}")
    return builder(state)


def _secondary_prompts(phase_num: int, state: dict[str, Any], primary_output: str) -> str:
    builder = _SECONDARY_BUILDERS.get(phase_num)
    if not builder:
        raise ValueError(f"No secondary prompt defined for phase {phase_num} (SINGLE strategy phase)")
    return builder(state, primary_output)
