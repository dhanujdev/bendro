# Skill: architecture-diagram-update

Invoke whenever service boundaries, data flows, or DB schema change significantly.
Architecture diagrams are part of the PR — not an afterthought.

## Trigger Conditions
| Change | Diagrams to Update |
|--------|-------------------|
| New service or package added | container.md |
| New external system integrated | system-context.md, container.md |
| LangGraph node added/removed/renamed | component-orchestrator.md, workflow-graph.md |
| Prisma schema change (new table) | er-diagram.md |
| New workflow type implemented | workflow-graph.md |
| Key request flow changed | sequence-diagrams.md |
| New package added to monorepo | container.md |

## Diagram Files

### docs/architecture/system-context.md (C4 Level 1)
```mermaid
C4Context
  title System Context — Creator OS
  
  Person(creator, "Content Creator", "Entrepreneur/influencer setting goals and reviewing content")
  Person(admin, "Platform Owner/Admin", "Controls policies, budgets, approvals")
  Person(developer, "Developer/Agent Builder", "Builds new workflows via Claude Code")
  
  System(creator_os, "Creator OS", "AI-assisted content creation and marketing platform")
  
  System_Ext(anthropic, "Anthropic API", "Claude LLM provider")
  System_Ext(langsmith, "LangSmith", "AI workflow tracing and evaluation")
  System_Ext(social, "Social Platforms", "Instagram, YouTube, LinkedIn")
  System_Ext(storage, "Object Storage", "MinIO (local) / S3 (prod)")
  
  Rel(creator, creator_os, "Sets goals, reviews artifacts, approves publishing", "HTTPS")
  Rel(admin, creator_os, "Configures policies, budgets, approves workflows", "HTTPS")
  Rel(developer, creator_os, "Builds workflows, deploys agents", "CLI/API")
  Rel(creator_os, anthropic, "LLM inference", "HTTPS/API")
  Rel(creator_os, langsmith, "Traces and evaluations", "HTTPS/API")
  Rel(creator_os, social, "Publishes content", "HTTPS/OAuth")
  Rel(creator_os, storage, "Stores media and artifacts", "S3 API")
```

### docs/architecture/container.md (C4 Level 2)
Show all services, packages, and their communication patterns.
Each service shows: technology, responsibility, communication direction.

### docs/architecture/component-orchestrator.md (C4 Level 3)
Show inside services/orchestrator: graphs, nodes, validators, model_router, state, repositories.
Show data flow: request → graph → node → model_router → validator → artifact.

### docs/architecture/er-diagram.md
```mermaid
erDiagram
    Workspace ||--o{ Project : "has many"
    Workspace ||--o{ WorkflowRun : "has many"
    Workspace ||--o{ BudgetSnapshot : "has one active"
    Project ||--o{ WorkflowRun : "triggers"
    WorkflowRun ||--o{ WorkflowStepRun : "has many"
    WorkflowRun ||--o{ GeneratedArtifact : "produces"
    WorkflowRun ||--o{ AuditEvent : "emits"
    WorkflowRun ||--o{ TokenUsageEvent : "records"
    WorkflowRun ||--o{ ValidationResult : "records"
    WorkflowRun ||--o{ ApprovalRequest : "may have"
    
    Workspace {
      uuid id PK
      string name
      uuid plan_tier_id FK
      datetime created_at
    }
    %% ... all entities with their key fields
```

### docs/architecture/workflow-graph.md
```mermaid
flowchart TD
    START([Start]) --> ingest_goal
    ingest_goal --> resolve_policy
    resolve_policy --> generate_brief
    generate_brief --> validate_brief
    validate_brief -->|passed| generate_strategy
    validate_brief -->|failed, retries_left| revise_brief
    validate_brief -->|failed, exhausted| approval_gate
    revise_brief --> generate_brief
    generate_strategy --> validate_strategy
    validate_strategy -->|passed| approval_gate
    validate_strategy -->|failed, retries_left| revise_strategy
    validate_strategy -->|failed, exhausted| approval_gate
    revise_strategy --> generate_strategy
    approval_gate -->|not_required| persist_artifacts
    approval_gate -->|required| INTERRUPT([⏸ Await Admin Approval])
    INTERRUPT -->|approved| persist_artifacts
    INTERRUPT -->|rejected| FAIL([Failed])
    persist_artifacts --> emit_final_events
    emit_final_events --> END([Complete])
```

### docs/architecture/sequence-diagrams.md
Key flows: goal intake, approval cycle, budget enforcement, auth flow.

## Diagram Rules
```
[ ] All Mermaid diagrams render without syntax errors
[ ] All relationships are labelled (protocol/pattern: HTTP, SQL, events, etc.)
[ ] Async flows use dashed arrows (--->)
[ ] External systems use a distinct style
[ ] Each diagram file has a title comment and last-updated date
[ ] Diagrams match the current code (not aspirational future state)
```

## Validate Diagrams
```bash
# Validate a single diagram
npx @mermaid-js/mermaid-cli --version  # verify installed
# Extract mermaid blocks and validate:
grep -A 100 '```mermaid' docs/architecture/container.md | grep -B 100 '```' \
  | npx mmdc -i /dev/stdin -o /dev/null 2>&1

# Or just visually verify by opening in VS Code with Mermaid preview extension
```

## After Updating Diagrams
```bash
git add docs/architecture/
git commit -m "docs(architecture): update {diagram-name} — {what changed and why}"
```
