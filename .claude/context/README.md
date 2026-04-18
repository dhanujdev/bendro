# Context & Templates — Creator OS

This directory contains templates and reference patterns for every kind of work
done in this codebase. Use these as starting points. They are pre-wired to follow
our standards (naming conventions, docstrings, patterns, etc.).

---

## Templates Directory

```
context/templates/
├── python/
│   ├── fastapi-route.py          FastAPI route handler with proper patterns
│   ├── repository.py             Repository class with workspace_id enforcement
│   ├── adapter.py                Adapter class implementing a Protocol
│   ├── langgraph-node.py         LangGraph node function (pure async)
│   ├── pydantic-schemas.py       Request/Response Pydantic models
│   ├── unit-test.py              pytest unit test file
│   └── integration-test.py       Integration test with real DB
├── typescript/
│   ├── trpc-router.ts            tRPC router with Zod validation
│   ├── react-component.tsx       React Server Component
│   ├── api-client.ts             Type-safe API client function
│   └── vitest-test.ts            Vitest unit test
├── bdd/
│   ├── feature.feature           Gherkin feature file template
│   └── step-definitions.py       BDD step definitions template
├── api/
│   ├── openapi-spec.yaml         OpenAPI 3.0 spec template
│   └── asyncapi-event.yaml       AsyncAPI event spec template
└── docs/
    ├── adr.md                    Architectural Decision Record template
    ├── session-handoff.md        Session handoff template
    └── pr-description.md         Pull request description template
```

## How to Use Templates

1. Copy the template to the appropriate location
2. Replace `{PLACEHOLDER}` values with your specifics
3. The template already follows all standards — don't remove the pattern structure

## When Templates Go Out of Date

Templates are living documents. When standards change:
1. Update the template
2. Update docs/STANDARDS.md if the change is standard-wide
3. The `pre-write-check.py` hook will warn if new code deviates from patterns

---

*Maintained by: Engineering leadership*
