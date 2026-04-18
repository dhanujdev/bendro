# Command: cost-report

**Usage:** `/cost-report`

Query the local development database for cost and token usage metrics.
Requires: local Postgres running (docker-compose up -d).

## What This Command Does

Runs SQL queries against the local database and formats a cost report:

```bash
psql postgresql://postgres:postgres@localhost:5432/creator_os << 'SQL'

-- Token usage by workflow type (last 24 hours)
SELECT 
  wf.workflow_type,
  COUNT(tue.id) as llm_calls,
  SUM(tue.input_tokens) as total_input,
  SUM(tue.output_tokens) as total_output,
  SUM(tue.cost_usd) as total_cost_usd
FROM token_usage_events tue
JOIN workflow_runs wf ON tue.workflow_run_id = wf.id
WHERE tue.created_at > NOW() - INTERVAL '24 hours'
GROUP BY wf.workflow_type
ORDER BY total_cost_usd DESC;

-- Cost by tenant (last 24 hours)
SELECT 
  w.name as workspace_name,
  COUNT(tue.id) as llm_calls,
  SUM(tue.cost_usd) as total_cost_usd
FROM token_usage_events tue
JOIN workspaces w ON tue.workspace_id = w.id
WHERE tue.created_at > NOW() - INTERVAL '24 hours'
GROUP BY w.id, w.name
ORDER BY total_cost_usd DESC;

-- Budget snapshots (current state)
SELECT 
  w.name as workspace_name,
  bs.token_limit,
  bs.token_used,
  ROUND(100.0 * bs.token_used / bs.token_limit, 1) as token_pct,
  bs.cost_limit_usd,
  bs.cost_used_usd,
  ROUND(100.0 * bs.cost_used_usd / bs.cost_limit_usd, 1) as cost_pct
FROM budget_snapshots bs
JOIN workspaces w ON bs.workspace_id = w.id
WHERE bs.period_end > NOW()
ORDER BY cost_pct DESC;

-- Budget limit breaches
SELECT 
  w.name as workspace_name,
  ae.event_type,
  ae.payload->>'limit_type' as limit_type,
  ae.payload->>'limit_value' as limit_value,
  ae.payload->>'actual_value' as actual_value,
  ae.created_at
FROM audit_events ae
JOIN workspaces w ON ae.workspace_id = w.id
WHERE ae.event_type = 'budget_exceeded'
  AND ae.created_at > NOW() - INTERVAL '7 days'
ORDER BY ae.created_at DESC
LIMIT 10;

SQL
```

## Output Format
```
=== Creator OS Cost Report ===
Period: Last 24 hours
Generated: {timestamp}

TOKEN USAGE BY WORKFLOW TYPE:
  content_strategy_v1:  42 calls | 125,000 input | 38,000 output | $2.14
  video_packaging_v1:   18 calls |  54,000 input | 12,000 output | $0.72

COST BY TENANT:
  Acme Corp:            $1.85
  Beta Creator:         $0.67
  Test Workspace:       $0.34

BUDGET STATUS:
  Acme Corp:    Tokens 45% used | Cost 37% used ✓
  Beta Creator: Tokens 12% used | Cost 9% used ✓

RECENT BUDGET BREACHES (last 7 days): none

Total cost tracked: ${total}
```

## Requirements
- Postgres running: `docker ps | grep postgres`
- Tables exist: `token_usage_events`, `budget_snapshots`, `audit_events`, `workspaces`, `workflow_runs`
- (Available after Phase 2 — Domain Model complete)
