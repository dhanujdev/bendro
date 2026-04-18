/**
 * Pain-feedback thresholds and classification per
 * `.claude/rules/HEALTH_RULES.md §Pain Feedback Flow`.
 *
 * Keeping the thresholds in one module means:
 *   1. The UI (prompt copy via `disclaimers.ts`) and the recommender
 *      (deprioritisation in `personalization.ts`) share the exact same
 *      cut-offs — no drift.
 *   2. If the rule changes (e.g. HEALTH_RULES raises the high threshold
 *      from 7 to 8), we change one constant and every caller updates.
 */

export const PAIN_MEDIUM_THRESHOLD = 4
export const PAIN_HIGH_THRESHOLD = 7

/**
 * Tier label for a given 0–10 self-rating.
 *   0–3  "low"     → normal flow
 *   4–6  "medium"  → suggest gentler alternative
 *   7–10 "high"    → medical-guidance disclaimer + personalization penalty
 */
export type PainTier = "low" | "medium" | "high"

export function classifyPainRating(rating: number): PainTier {
  if (!Number.isFinite(rating) || rating < 0) return "low"
  if (rating >= PAIN_HIGH_THRESHOLD) return "high"
  if (rating >= PAIN_MEDIUM_THRESHOLD) return "medium"
  return "low"
}

/**
 * Does any recorded pain rating in this session cross the high-tier
 * threshold? Used by personalization to apply a deprioritisation penalty
 * to the routine (not a hard-remove — user can still pick it).
 */
export function sessionHadHighPain(
  painFeedback: Record<string, number> | undefined | null,
): boolean {
  if (!painFeedback) return false
  for (const rating of Object.values(painFeedback)) {
    if (classifyPainRating(rating) === "high") return true
  }
  return false
}
