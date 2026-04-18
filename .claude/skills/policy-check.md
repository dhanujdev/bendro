# Skill: policy-check

Invoke when adding a new workflow, tool, or capability that affects owner control.
The platform owner must be able to configure, restrict, or disable any capability.

## Policy Coverage Check
```
[ ] New capability is represented in the WorkspacePolicy Pydantic model
    → Location: packages/policy-engine/src/models.py
[ ] Owner can enable/disable this capability per workspace
[ ] If it involves LLM calls: owner can configure which models are allowed
[ ] If it involves cost: budget check runs before execution
[ ] If it could produce sensitive content: content moderation gate is in place
[ ] New policy field has a safe default (err on side of restriction, not permissiveness)
```

## Policy Resolution Verification
```
[ ] New capability respects the 4-layer resolution hierarchy:
      1. Global platform default (hardcoded)
      2. Plan-tier restriction (from plan_tiers table)
      3. Workspace override (from workspace_policy table)
      4. Workflow-specific override (from workflow_definitions)
[ ] PolicyResolver.resolve() handles the new field correctly
[ ] Cached policy TTL is ≤ 60 seconds (not longer)
```

## Audit Coverage
```
[ ] Policy enforcement decisions emit policy_enforced audit event via packages/observability
[ ] Policy configuration changes (owner updates) emit policy_updated audit event
[ ] Admin dashboard can surface policy enforcement events for this capability
[ ] Budget checks emit budget_checked audit event (even when budget not exceeded)
```

## Documentation
```
[ ] docs/GOVERNANCE.md updated with the new policy dimension
[ ] docs/specs/POLICY_MODEL.md updated with new YAML field
[ ] Example policy YAML/JSON added to docs/examples/policy/ showing the new option
[ ] Admin UI (apps/admin/policies) updated to expose the new configuration option
```

## Test Coverage
```
[ ] Unit test: policy resolution with new field present (override works)
[ ] Unit test: policy resolution with new field absent (default applies)
[ ] Integration test: capability blocked when policy disables it
[ ] Integration test: capability allowed when policy enables it
[ ] Budget test: hard stop triggers when per-run limit exceeded
```

## Policy Model Update Template
```python
class WorkspacePolicy(BaseModel):
    """Complete workspace policy configuration.
    
    Resolved from 4 layers: global default → plan tier → workspace override → workflow-specific.
    Cached for max 60 seconds. Changes take effect within one cache TTL.
    """
    
    # ... existing fields ...
    
    # NEW FIELD EXAMPLE:
    enable_video_processing: bool = Field(
        default=False,
        description=(
            "Whether video upload and processing is enabled for this workspace. "
            "Disabled by default — requires explicit owner opt-in. "
            "Requires the video_processing plan feature to be active."
        )
    )
```
