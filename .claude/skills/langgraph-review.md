# Skill: langgraph-review

Invoke this skill whenever a LangGraph workflow graph is **created or modified**.
Invoke it BEFORE the change is committed and again in the PR review.

## Pre-Conditions
- docs/specs/LANGGRAPH_WORKFLOW_V1.md has been read
- ADR-0004 (LangGraph orchestration) has been read

## Review Checklist

### State Schema
```
[ ] State is a Pydantic TypedDict — NOT a raw dict
[ ] All fields have explicit types and docstring descriptions
[ ] State includes REQUIRED base fields:
      run_id: str (UUID)
      tenant_id: str (UUID)
      user_id: str (UUID)
      workflow_type: str
      retry_count: int
      max_retries: int
      validation_results: list[ValidationResult]
      status: Literal["running","awaiting_approval","completed","failed"]
      audit_events_emitted: list[str]
      error: str | None
[ ] No raw dict fields (use TypedDict or Pydantic models for nested structures)
[ ] Optional fields use | None explicitly, not Optional[X]
```

### Node Functions
```
[ ] Every node is a pure function: (state: WorkflowState) -> dict
[ ] Nodes return ONLY the state fields they modify (not the full state)
[ ] Every node that calls an LLM: goes through model_router.py ONLY
[ ] Every node emits at minimum:
      - node_started event at beginning
      - node_completed event at end (with duration_ms)
[ ] Every node that calls an LLM also emits: model_called event with token metadata
[ ] Error handling: explicit try/except, failed nodes set state["status"] = "failed"
      and state["error"] = {structured error message}
[ ] No side effects except: DB writes via repository, audit events via observability
[ ] Node functions are in services/orchestrator/nodes/ — NOT inline in the graph file
```

### Edges and Routing
```
[ ] NO inline lambda conditions — all routing is in named functions
      BAD:  .add_conditional_edges("validate", lambda s: "retry" if s["retries"] < 3 else "fail")
      GOOD: .add_conditional_edges("validate", route_after_validation)
[ ] Retry loop has explicit max_retries guard:
      def route_after_validation(state: WorkflowState) -> str:
          if all(r.passed for r in state["validation_results"]):
              return "next_node"
          if state["retry_count"] >= state["max_retries"]:
              return "approval_gate"  # escalation path
          return "revise_and_retry"   # retry path
[ ] Approval interrupt uses Command(resume=...) pattern
[ ] Resume payload schema is documented in the node docstring
[ ] Terminal nodes explicitly set status: state["status"] = "completed" | "failed"
[ ] No dead-end nodes (every node has at least one outgoing edge)
```

### Checkpointing
```
[ ] Checkpointer is PostgresSaver (NOT InMemorySaver — InMemorySaver is tests-only)
[ ] Thread ID = workflow_run_id (unique per run, never reused)
[ ] Checkpoint namespace = workflow_type
[ ] Checkpointer connection uses async context manager correctly
```

### File Organization
```
[ ] Graph definition in: services/orchestrator/graphs/{workflow_name}.py
[ ] State definition in: services/orchestrator/state/{workflow_name}_state.py
[ ] Node functions in: services/orchestrator/nodes/{workflow_name}_nodes.py
[ ] Validators in: services/orchestrator/validators/ (shared across workflows)
[ ] No LangGraph imports anywhere outside services/orchestrator/
```

### Tests Required
```
[ ] Unit test for EACH node function (mocked state input, verify return dict)
[ ] Integration test for FULL graph with test checkpointer (AsyncPostgresSaver on test DB)
[ ] Test: happy path (all validators pass, no approval required)
[ ] Test: retry loop (validation fails, retries, eventually passes)
[ ] Test: max retry exhaustion (retries >= max_retries → escalation)
[ ] Test: approval interrupt (workflow pauses, receives Command(resume=...), continues)
[ ] Test: budget exceeded (model_router raises BudgetExceededError → workflow fails gracefully)
```

### Architecture Diagram Update
```
[ ] docs/architecture/workflow-graph.md updated with new/changed graph
[ ] docs/architecture/component-orchestrator.md updated if new nodes/edges added
[ ] Invoke architecture-diagram-update skill
```

## Common Violations to Look For
1. `InMemorySaver` used in non-test code → replace with `PostgresSaver`
2. Direct `anthropic.messages.create()` calls inside a node → move to `model_router.py`
3. Inline lambda in `add_conditional_edges` → extract to named function
4. State returned as full dict copy instead of partial update → return only changed fields
5. Raw dict instead of TypedDict for state → define proper TypedDict
6. Missing `node_started` / `node_completed` event emission → add to every node
7. Missing `workspace_id` in state → add to base state schema
