---
name: architecture-diagram-update
description: >
  Invoked when a module boundary changes in bendro — new service in src/services/,
  new external SDK wrapper, new route group, pose-module change, or schema change.
  Updates the Mermaid diagrams in docs/architecture/ (system context, component,
  sequence, ER) so they match current reality.
---

# Skill: architecture-diagram-update

Invoke whenever module boundaries, data flows, or the Drizzle schema change.
Architecture diagrams ship in the same PR as the code change — never as an afterthought.

## Trigger Conditions
| Change | Diagrams to Update |
|--------|-------------------|
| New service file added under `src/services/` | component.md |
| New external SDK wrapped (Stripe, MediaPipe, AI client) | system-context.md, component.md |
| Drizzle schema change in `src/db/schema.ts` | er-diagram.md |
| Pose / VRM driver refactor in `src/lib/pose/` | component.md, sequence-player.md |
| New route group added under `src/app/` | component.md |
| Key request flow changed (session create, streak update, checkout) | sequence-*.md |
| NextAuth, Stripe, or Neon integration wired up | system-context.md |

## Diagram Files

### docs/architecture/system-context.md (C4 Level 1)
Shows bendro and its external dependencies.

```mermaid
C4Context
  title System Context — Bendro

  Person(user, "End User", "Adult working on flexibility and mobility")

  System(bendro, "Bendro", "AI-guided flexibility + mobility copilot (Next.js on Vercel)")

  System_Ext(neon, "Neon Postgres", "Serverless Postgres (production DB)")
  System_Ext(nextauth, "NextAuth Provider", "OAuth/email identity (Phase 3+)")
  System_Ext(stripe, "Stripe", "Subscription billing (Phase 9+)")
  System_Ext(mediapipe, "MediaPipe Tasks Vision", "Client-side pose detection")
  System_Ext(vercel, "Vercel Platform", "Hosting, Edge runtime, Analytics")
  System_Ext(sentry, "Sentry", "Error + perf monitoring (Phase 12+)")

  Rel(user, bendro, "Browses routines, runs sessions, tracks streaks", "HTTPS")
  Rel(bendro, neon, "Reads/writes user + catalog data", "SQL over TLS")
  Rel(bendro, nextauth, "Sign-in", "OAuth/OIDC")
  Rel(bendro, stripe, "Checkout, webhooks, subscription lifecycle", "HTTPS")
  Rel(user, mediapipe, "Pose landmarks computed in-browser", "WebAssembly — no upload")
  Rel(bendro, vercel, "Build, deploy, serve", "Git integration")
  Rel(bendro, sentry, "Error reports", "HTTPS")
```

### docs/architecture/component.md (C4 Level 2/3)
Show the internal modules: route groups, services, db, lib/pose.
Annotate each with its responsibility and what it imports.

```mermaid
flowchart LR
  subgraph App[src/app]
    MKT["(marketing)"]
    APP["(app)"]
    ONB[onboarding]
    PLY[player]
    API[api/**/route.ts]
  end

  subgraph Services[src/services]
    ROUT[routines.ts]
    SES[sessions.ts]
    STR[streaks.ts]
    BIL[billing.ts]
    PER[personalization.ts]
  end

  subgraph Lib[src/lib]
    DATA[data.ts — mock/DB adapter]
    POSE[pose/vrm-driver.ts]
  end

  subgraph DB[src/db]
    SCH[schema.ts]
    IDX[index.ts]
  end

  API --> Services
  APP --> Services
  ONB --> Services
  PLY --> POSE
  Services --> DATA
  DATA --> DB
  BIL -->|Stripe SDK| EXT_STRIPE[(Stripe)]
```

### docs/architecture/er-diagram.md
Drizzle schema as an ER diagram. Update on every `src/db/schema.ts` change.

```mermaid
erDiagram
    users ||--o{ sessions : "records"
    users ||--o{ favorites : "owns"
    users ||--|| streaks : "has"
    routines ||--o{ routine_stretches : "contains"
    stretches ||--o{ routine_stretches : "appears in"
    routines ||--o{ sessions : "completed as"

    users {
      uuid id PK
      text email
      text name
      text subscriptionStatus
      timestamp createdAt
    }
    routines {
      uuid id PK
      uuid ownerId FK "nullable — null = catalog"
      text title
      int durationSeconds
    }
    %% ... remaining tables
```

### docs/architecture/sequence-player.md
Camera -> pose -> avatar flow. Emphasize that pose data never leaves the client.

```mermaid
sequenceDiagram
  actor User
  participant Player as /player page (client)
  participant Pose as src/lib/pose/vrm-driver.ts
  participant MP as MediaPipe (WASM, in-browser)
  User->>Player: Click "Start camera"
  Player->>Pose: initialize()
  Pose->>MP: load model (in-browser)
  loop per animation frame
    Player->>MP: videoFrame
    MP-->>Pose: landmarks
    Pose-->>Player: VRM bone transforms
  end
  Note over Player,MP: Landmarks + frames NEVER leave the browser
```

### docs/architecture/sequence-session-create.md
Happy-path POST /api/sessions. Shows: route -> service -> data adapter -> mock OR Neon.

## Diagram Rules
```
[ ] All Mermaid blocks render without syntax errors
[ ] Every relationship is labelled with protocol/pattern (HTTPS, SQL, WASM, etc.)
[ ] Async flows use dashed arrows (-->)
[ ] External systems styled distinctly from internal modules
[ ] Each file has a one-line title and a "Last updated: YYYY-MM-DD" comment
[ ] Diagrams describe the CURRENT code, not aspirational future state
```

## Validate Diagrams
```bash
# Syntax-check by rendering to /dev/null
npx @mermaid-js/mermaid-cli -i docs/architecture/component.md -o /tmp/_.svg

# Or open in VS Code with the Mermaid preview extension
```

## After Updating Diagrams
```bash
git add docs/architecture/
git commit -m "docs(architecture): update {diagram-name} — {what changed and why}"
```
