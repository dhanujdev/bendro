# Skill: cost-tracking-check

Invoke when adding or modifying any code that calls an LLM.
Every LLM call must be tracked, budgeted, and audited.

## Before the LLM Call
```
[ ] Budget check runs BEFORE the LLM call (not after)
    → Calls BudgetEnforcementService.check_before_llm_call(workspace_id, estimated_tokens, run_id)
    → If over any limit: raises BudgetExceededError, emits budget_exceeded audit event
    → Workflow halts — does NOT continue over budget
[ ] Correct function called: model_router.call() — NOT anthropic.messages.create() directly
[ ] ModelConfig comes from model_router.route(workflow_type, step, policy)
    → Ensures policy-configured model is used (not hardcoded)
```

## During the LLM Call (model_router handles this)
```
[ ] Token usage metadata captured from API response (not estimated)
    → input_tokens, output_tokens from response headers/body
[ ] Provider and model_id captured from ModelConfig
[ ] Call duration (duration_ms) measured
[ ] Request/response NOT logged (contains user data and potentially sensitive content)
```

## After the LLM Call
```
[ ] model_router.record_usage() called immediately after successful call
[ ] TokenUsageEvent record inserted (IMMUTABLE — append only):
      workspace_id, workflow_run_id, node_name, model_id, provider,
      input_tokens, output_tokens, cost_usd, created_at
[ ] model_called audit event emitted via packages/observability with:
      event_type: "model_called"
      run_id, node_name, model_id, provider,
      input_tokens, output_tokens, cost_usd, duration_ms
[ ] budget_snapshots updated atomically (token_used + X, cost_used + Y)
[ ] Retry count tracked if call fails — exponential backoff for retryable errors
```

## Cost Calculation
```python
# Approximate cost calculation by provider/model
# Actual costs from API response headers or provider pricing tables
COST_PER_MILLION_TOKENS = {
    "anthropic": {
        "claude-opus-4-6":   {"input": 15.00, "output": 75.00},    # $ per M tokens
        "claude-sonnet-4-6": {"input": 3.00,  "output": 15.00},
        "claude-haiku-4-5":  {"input": 0.25,  "output": 1.25},
    }
}

def calculate_cost(model_id: str, provider: str, input_tokens: int, output_tokens: int) -> Decimal:
    """Calculate cost in USD for a model call.
    
    Uses pricing table as fallback if API doesn't return cost.
    Rounds to 6 decimal places (sub-cent precision for tracking).
    """
    pricing = COST_PER_MILLION_TOKENS[provider][model_id]
    cost = (input_tokens * pricing["input"] + output_tokens * pricing["output"]) / 1_000_000
    return Decimal(str(cost)).quantize(Decimal("0.000001"))
```

## Test Requirements
```
[ ] Unit test: budget check blocks when over monthly token limit
[ ] Unit test: budget check blocks when over per-run token limit  
[ ] Unit test: budget check blocks when over monthly cost limit
[ ] Unit test: TokenUsageEvent is created with correct fields after successful call
[ ] Unit test: budget_snapshots updated correctly after call
[ ] Integration test: workflow halts and emits budget_exceeded when over budget
[ ] Integration test: cost dashboard shows accurate aggregate by tenant
```

## Review Pattern — What a Compliant LLM Call Looks Like
```python
async def generate_brief(state: ContentStrategyState) -> dict:
    """Generate a structured content brief from the normalized goal.
    
    Calls Claude via model_router, which handles policy routing, budget enforcement,
    and token tracking. Emits model_called audit event automatically.
    """
    # Emit node start event
    await emit(NodeStartedEvent(run_id=state["run_id"], node_name="generate_brief"))
    
    # Check budget BEFORE calling (model_router also checks, but belt-and-suspenders)
    await budget_service.check_before_llm_call(
        workspace_id=state["tenant_id"],
        estimated_tokens=2000,
        run_id=state["run_id"],
    )
    
    # Route through model_router — NEVER call anthropic SDK directly
    config = model_router.route("content_strategy_v1", "generate_brief", state["policy"])
    response = await model_router.call(
        messages=[{"role": "user", "content": build_brief_prompt(state["goal_input"])}],
        config=config,
        run_id=state["run_id"],
    )
    # model_router.call() automatically:
    #   - Records TokenUsageEvent
    #   - Emits model_called audit event
    #   - Updates budget_snapshots
    
    # Parse response into typed model
    brief = ContentBrief.model_validate_json(response.content)
    
    await emit(NodeCompletedEvent(run_id=state["run_id"], node_name="generate_brief", ...))
    return {"content_brief": brief}
```
