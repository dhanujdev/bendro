# Skill: workflow-adapter-check

Invoke when validating job orchestration design — specifically when adding or modifying
Inngest job functions or designing the interface between the API and background workers.

## Core Principle (ADR-0011)
All job/workflow operations go through the `WorkflowJobAdapter` interface.
This allows migration from Inngest to Temporal without touching business logic.

## Adapter Interface Review
```
[ ] WorkflowJobAdapter protocol is defined in packages/shared or services/workers
[ ] InngestAdapter implements WorkflowJobAdapter
[ ] No direct inngest.createFunction() calls outside of services/workers/
[ ] Services call adapter.enqueue_job() — not inngest directly
[ ] Job handler functions are pure and testable (no Inngest SDK imports in handler logic)
```

## Job Design Rules
```
[ ] Every job is IDEMPOTENT:
      Running the same job twice with the same input produces the same result
      Implement using: database state check at job start, skip if already processed
[ ] Every job handles PARTIAL FAILURE:
      If job fails midway, re-running from the beginning is safe
      Use database transactions to prevent partial state
[ ] Every job emits start and completion audit events
[ ] Job functions are in services/workers/src/jobs/ — not inline
[ ] Job payloads are validated with Pydantic/Zod before processing
```

## Inngest Job Pattern
```typescript
// services/workers/src/jobs/process-upload.ts
import { inngest } from '../inngest-client'
import type { UploadProcessJobPayload } from '@creator-os/shared'

/**
 * Process a media upload: extract metadata, trigger transcription, create transcript record.
 * 
 * Idempotent: checks if transcript already exists before processing.
 * Emits: upload.processing_started, upload.processing_completed audit events.
 */
export const processUploadJob = inngest.createFunction(
  {
    id: 'process-upload',
    name: 'Process Media Upload',
    retries: 3,  // Inngest handles retry with exponential backoff
  },
  { event: 'upload/process' },
  async ({ event, step }) => {
    const { upload_id, workspace_id } = event.data as UploadProcessJobPayload
    
    // Idempotency check
    const existing = await step.run('check-existing-transcript', async () => {
      return transcriptRepository.findByUploadId(upload_id, workspace_id)
    })
    
    if (existing) {
      return { skipped: true, reason: 'Already processed' }
    }
    
    // ... processing steps
  }
)
```

## Test Requirements
```
[ ] Unit test for job handler logic (mock all external calls)
[ ] Integration test: job enqueue → handler execution → expected DB state
[ ] Idempotency test: run same job twice → result is identical, no duplicate records
[ ] Failure test: job fails → retry count increments → final failure emits audit event
```

## Temporal Migration Readiness
Ensure the WorkflowJobAdapter interface is ready for Temporal when needed:
```python
class WorkflowJobAdapter(Protocol):
    async def enqueue(self, job_type: str, payload: dict, workspace_id: str) -> str: ...
    async def get_status(self, job_id: str) -> JobStatus: ...
    async def cancel(self, job_id: str) -> None: ...

class InngestAdapter:
    """Inngest implementation of WorkflowJobAdapter. MVP — replace with Temporal at scale."""
    ...

class TemporalAdapter:
    """Temporal implementation. Use when workflows exceed Inngest's capabilities."""
    ...
```
