# Skill: contract-first

Invoke this skill **BEFORE writing any implementation code** for a new endpoint, event, or workflow.
The contract must be committed to git before any implementation begins.

## Rule (ADR-0013)
The contract is the specification. Implementation conforms to the contract — not the other way around.
If you discover the contract needs changing during implementation, update the contract first and commit it.

## For REST Endpoints (OpenAPI)

### File Location
`docs/specs/openapi/v1/{resource}.yaml`
Examples: `workflow-runs.yaml`, `projects.yaml`, `approvals.yaml`

### Minimum Required Sections
```yaml
openapi: "3.1.0"
info:
  title: Creator OS API — {Resource}
  version: "1.0.0"

paths:
  /api/v1/{resource}:
    post:
      operationId: {resourceCreate}        # required — unique, camelCase
      summary: {Short action summary}
      description: |
        {Longer description. Include: what this endpoint does, when to use it,
        key side effects (e.g., starts async workflow), and auth requirements.}
      security:
        - bearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/{ResourceCreateRequest}'
            example:
              {field}: {example value}
      responses:
        '202':
          description: Accepted — async operation queued
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/WorkflowRunResponse'
        '400':
          $ref: '#/components/responses/BadRequest'
        '401':
          $ref: '#/components/responses/Unauthorized'
        '403':
          $ref: '#/components/responses/Forbidden'
        '422':
          $ref: '#/components/responses/ValidationError'
        '500':
          $ref: '#/components/responses/InternalError'

components:
  schemas:
    {ResourceCreateRequest}:
      type: object
      required: [{required_field}]
      properties:
        {field}:
          type: string
          description: "{What this field is and what values are valid}"
          example: "{example value}"
  
  responses:
    BadRequest:
      description: Invalid request format
      content:
        application/json:
          schema:
            $ref: '#/components/schemas/ErrorResponse'
    # ... standard responses
    
  securitySchemes:
    bearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT
```

### Validate the Spec
```bash
npx @redocly/cli lint docs/specs/openapi/v1/{resource}.yaml
```
Must pass before committing.

## For Async Events (AsyncAPI)

### File Location
`docs/specs/asyncapi/{event-name}.yaml`

### Minimum Required Sections
```yaml
asyncapi: "2.6.0"
info:
  title: "{EventName} Event"
  version: "1.0.0"

channels:
  creator-os/{event-name}:
    description: "{When this event is emitted and what consumers do with it}"
    publish:
      operationId: publish{EventName}
      message:
        $ref: '#/components/messages/{EventName}'

components:
  messages:
    {EventName}:
      name: {EventName}
      payload:
        type: object
        required: [event_type, run_id, tenant_id, timestamp]
        properties:
          event_type:
            type: string
            const: "{event.type.snake_case}"
          run_id:
            type: string
            format: uuid
          tenant_id:
            type: string
            format: uuid
          timestamp:
            type: string
            format: date-time
          # ... event-specific fields
```

## For LangGraph Workflows

### File Location
`docs/specs/workflows/{workflow-name}.md`

### Required Sections
```markdown
# Workflow Spec: {workflow-name}

## Input Schema
{Pydantic model definition with all fields and descriptions}

## Output Schema (Generated Artifacts)
{What artifacts are created and their schemas}

## State Schema
{Full TypedDict/Pydantic model for the workflow state}

## Error Schema
{What errors can be returned, when, and how to handle them}

## Policy Dependencies
{What policy fields affect this workflow's behavior}
```

## After Writing the Spec
1. `git commit -m "docs(contracts): add OpenAPI spec for {resource}"`
2. Only THEN proceed to `bdd-scenario-write` skill
3. Contract spec is the input to all downstream steps

## Contract Change Protocol
If implementation reveals the contract needs adjustment:
1. Update the contract spec file
2. `git commit -m "docs(contracts): update {resource} spec — {reason}"`
3. Then update the failing tests to match the new contract
4. Then update the implementation
5. Document the breaking change in CHANGELOG.md if it's a breaking change
