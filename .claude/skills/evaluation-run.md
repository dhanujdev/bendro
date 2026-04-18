# Skill: evaluation-run

Invoke before promoting any release from dev to staging.
LangSmith evaluation must pass before staging promotion is allowed.

## Pre-Conditions
```
[ ] LangSmith API key configured: LANGSMITH_API_KEY in .env
[ ] LangSmith project exists for environment: creator-os-{local|dev|staging}
[ ] Evaluation dataset "creator-os-v1-golden" exists with ≥ 25 examples
[ ] Three evaluators are defined and registered:
      - structure_completeness: checks required sections present and non-empty
      - quality_score: 0.0–1.0 score from LLM judge
      - policy_compliance: binary pass/fail — hardest gate
```

## Run Evaluation
```bash
# Run the evaluation suite against current orchestrator
python services/orchestrator/scripts/run_evaluation.py \
  --dataset creator-os-v1-golden \
  --project creator-os-$(git rev-parse --abbrev-ref HEAD) \
  --output docs/eval-results/$(date +%Y%m%d-%H%M%S).json
```

## Evaluation Pass Thresholds
| Evaluator | Minimum Pass Rate | Action if Fail |
|-----------|------------------|----------------|
| structure_completeness | ≥ 95% | BLOCK staging promotion |
| quality_score | ≥ 0.75 average | BLOCK staging promotion |
| policy_compliance | 100% | BLOCK staging promotion (hard gate) |

## Interpreting Results
```bash
# Print results summary
python services/orchestrator/scripts/eval_report.py \
  --input docs/eval-results/{latest-file}.json

# Example output:
# Evaluation: creator-os-v1-golden (25 examples)
# structure_completeness:  24/25 = 96.0% ✓
# quality_score:           avg 0.81 ✓
# policy_compliance:       25/25 = 100.0% ✓
# Overall: PASS — Safe to promote to staging
```

## If Evaluation Fails
1. Do NOT promote to staging
2. File a P0 blocker in docs/BLOCKERS.md:
   ```
   | B-{NNN} | Evaluation gate failed: {evaluator} at {score}% | Blocks staging promotion | Fix failing cases in LangSmith trace view | {date} |
   ```
3. Investigate failing cases in LangSmith:
   - Filter traces by evaluation score < threshold
   - Identify pattern in failures (prompt issue? validator misconfiguration? policy conflict?)
   - Fix root cause (prompt template, validator threshold, or golden example correction)
4. Re-run evaluation after fix

## Adding to LangSmith Dataset
When creating or updating golden examples:
```python
from langsmith import Client

client = Client()
dataset = client.read_dataset(dataset_name="creator-os-v1-golden")

# Add a new example
client.create_example(
    inputs={
        "goal": "Create LinkedIn content for Q4 product launch targeting CTOs",
        "brand_voice": "Professional, data-driven, thought leadership",
        "channels": ["linkedin"],
        "target_audience": "B2B tech executives"
    },
    outputs={
        "brief_structure": {
            "sections": ["goal", "audience", "key_messages", "tone", "cta"],
            "channel_specific": {"linkedin": {...}}
        },
        "strategy_outline": {
            "posts": 5,
            "content_types": ["insight", "case_study", "question"],
            "posting_schedule": "weekdays_9am"
        }
    },
    dataset_id=dataset.id,
    metadata={"difficulty": "medium", "workflow_type": "content_strategy_v1"}
)
```

## Record Results
After each evaluation run, append to docs/EXECUTION_LOG.md:
```
[{timestamp}] Evaluation run: dataset=creator-os-v1-golden ({N} examples) | structure={score}% | quality={score} | policy={score}% | Result: PASS/FAIL
```
