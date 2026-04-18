import { db } from "@/db";
import type { GeneratePlanInput, RoutineType, Goal } from "@/types/routine";
import type { BodyArea } from "@/types/stretch";
import { sessionHadHighPain } from "./safety";

// ─── Goal → body area mapping ─────────────────────────────────────────────────

export const GOAL_BODY_AREAS: Record<string, BodyArea[]> = {
  flexibility: ["hips", "hamstrings", "shoulders", "chest", "calves"],
  mobility: ["hips", "ankles", "shoulders", "wrists", "upper_back"],
  recovery: ["lower_back", "quads", "hamstrings", "calves", "glutes"],
  stress_relief: ["neck", "shoulders", "upper_back", "chest", "full_body"],
  posture: ["neck", "shoulders", "chest", "upper_back", "lower_back"],
  athletic_performance: [
    "hips",
    "quads",
    "hamstrings",
    "calves",
    "glutes",
    "ankles",
  ],
  pain_relief: ["lower_back", "neck", "shoulders", "hips", "upper_back"],
};

// Warmup body areas (gentle mobilization)
const WARMUP_AREAS: BodyArea[] = [
  "neck",
  "shoulders",
  "ankles",
  "wrists",
];

// Cooldown body areas (sustained holds)
const COOLDOWN_AREAS: BodyArea[] = [
  "hamstrings",
  "calves",
  "full_body",
];

const TRANSITION_SEC = 10;

// ─── Phase buckets ────────────────────────────────────────────────────────────

function classifyPhase(bodyAreas: string[]): "warmup" | "main" | "cooldown" {
  if (bodyAreas.some((a) => WARMUP_AREAS.includes(a as BodyArea))) {
    return "warmup";
  }
  if (bodyAreas.some((a) => COOLDOWN_AREAS.includes(a as BodyArea))) {
    return "cooldown";
  }
  return "main";
}

// ─── Main engine ──────────────────────────────────────────────────────────────

export async function generateRoutine(input: GeneratePlanInput) {
  const {
    goals,
    focusAreas,
    avoidAreas,
    timeBudgetSec,
    intensity,
  } = input;

  // 1. Determine target body areas from goals
  const targetAreas = new Set<BodyArea>();
  for (const goal of goals) {
    (GOAL_BODY_AREAS[goal] ?? []).forEach((a) => targetAreas.add(a));
  }
  focusAreas.forEach((a) => targetAreas.add(a));

  // 2. Fetch candidate stretches
  const candidateStretches = await db.query.stretches.findMany();

  // 3. Filter: exclude avoid areas
  const filtered = candidateStretches.filter((s) => {
    const areas = s.bodyAreas as string[];
    // Must not overlap with avoidAreas
    if (avoidAreas.length > 0 && areas.some((a) => avoidAreas.includes(a as BodyArea))) {
      return false;
    }
    // Must match at least one target area
    return areas.some((a) => targetAreas.has(a as BodyArea));
  });

  // 4. Score: bias toward focusAreas and matching intensity
  const scored = filtered.map((s) => {
    let score = 0;
    const areas = s.bodyAreas as string[];
    score += areas.filter((a) => (focusAreas as string[]).includes(a)).length * 3;
    score += areas.filter((a) => targetAreas.has(a as BodyArea)).length;
    if (s.intensity === intensity) score += 2;
    return { stretch: s, score };
  });

  scored.sort((a, b) => b.score - a.score);

  // 5. Fill time budget with warmup → main → cooldown
  const buckets: Record<string, typeof scored> = {
    warmup: [],
    main: [],
    cooldown: [],
  };

  for (const item of scored) {
    const phase = classifyPhase(item.stretch.bodyAreas as string[]);
    buckets[phase].push(item);
  }

  const selected: Array<{ stretch: (typeof scored)[0]["stretch"]; durationSec: number }> = [];
  let remainingSec = timeBudgetSec;

  function pickPhase(phase: "warmup" | "main" | "cooldown", maxItems: number) {
    const pool = buckets[phase];
    const seen = new Set<string>();
    for (const item of pool) {
      if (selected.length >= maxItems + selected.length) break;
      if (seen.has(item.stretch.id)) continue;

      const dur = item.stretch.defaultDurationSec;
      const cost = item.stretch.bilateral ? dur * 2 + TRANSITION_SEC : dur + TRANSITION_SEC;

      if (cost > remainingSec) continue;

      seen.add(item.stretch.id);
      selected.push({ stretch: item.stretch, durationSec: item.stretch.bilateral ? dur * 2 : dur });
      remainingSec -= cost;
    }
  }

  // Warmup: ~20% of time, max 3 stretches
  const warmupBudget = Math.floor(timeBudgetSec * 0.2);
  const savedRemaining = remainingSec;
  remainingSec = warmupBudget;
  pickPhase("warmup", 3);
  remainingSec = savedRemaining - (warmupBudget - remainingSec);

  // Main: ~65% of time
  const mainBudget = Math.floor(timeBudgetSec * 0.65);
  remainingSec = Math.min(remainingSec, mainBudget);
  const beforeMain = remainingSec;
  pickPhase("main", 10);
  remainingSec = savedRemaining - (warmupBudget - (savedRemaining - beforeMain)) - (beforeMain - remainingSec);

  // Cooldown: remaining
  pickPhase("cooldown", 3);

  // 6. Build ordered routine with phase ordering
  const warmupItems = selected.filter(
    (s) => classifyPhase(s.stretch.bodyAreas as string[]) === "warmup"
  );
  const mainItems = selected.filter(
    (s) => classifyPhase(s.stretch.bodyAreas as string[]) === "main"
  );
  const cooldownItems = selected.filter(
    (s) => classifyPhase(s.stretch.bodyAreas as string[]) === "cooldown"
  );

  const ordered = [...warmupItems, ...mainItems, ...cooldownItems];
  const totalSec = ordered.reduce((acc, s) => acc + s.durationSec + TRANSITION_SEC, 0);

  return {
    stretches: ordered,
    totalDurationSec: Math.max(0, totalSec - TRANSITION_SEC), // no trailing transition
    goal: goals[0],
    intensity,
  };
}

// ─── Catalog filter (profile-aware) ──────────────────────────────────────────
//
// Phase 6 + Phase 11: filter the routine catalog by the user's persisted
// profile.
//
//   - If `goals` is non-empty, keep only routines whose `goal` is in it. An
//     empty goals array means "no preference yet" → don't filter by goal.
//   - If `avoidAreas` is non-empty, drop routines whose `goal` maps (via
//     GOAL_BODY_AREAS) to ANY avoided area. Coarse-grained proxy for a
//     stretch-level caution check; tightening needs a routines.cautions
//     column (see Phase-11 checkpoint for the deferred schema work).
//   - If `safetyFlag` is true, keep ONLY `level === "gentle"` routines.
//     This literally matches the onboarding safety-gate copy mandated by
//     HEALTH_RULES.md ("We'll default your library to gentle routines")
//     and is the most conservative interpretation of §Pre-Existing
//     Condition Gating until a routines.cautions column exists. Prior
//     Phase-6 behaviour was "drop level === deep"; Phase 11 tightens to
//     "keep only gentle" so moderate-intensity routines are ALSO filtered
//     out for flagged users.
//
// Scoring is deliberately NOT done here — this is a filter. Ranking belongs
// to `suggestRoutinesForUser` and future recommenders.

export interface FilterProfile {
  goals: Goal[]
  avoidAreas: BodyArea[]
  safetyFlag: boolean
}

export function filterRoutineCatalog<R extends Pick<RoutineType, "goal" | "level">>(
  routines: R[],
  profile: FilterProfile,
): R[] {
  const avoidedGoalBodyAreas = new Set<BodyArea>(profile.avoidAreas)

  return routines.filter((r) => {
    if (profile.goals.length > 0 && !profile.goals.includes(r.goal)) {
      return false
    }

    if (avoidedGoalBodyAreas.size > 0) {
      const goalAreas = GOAL_BODY_AREAS[r.goal] ?? []
      if (goalAreas.some((a) => avoidedGoalBodyAreas.has(a))) {
        return false
      }
    }

    if (profile.safetyFlag && r.level !== "gentle") {
      return false
    }

    return true
  })
}

// ─── Pain-history deprioritisation ───────────────────────────────────────────
//
// Phase 11 (HEALTH_RULES.md §Pain Feedback Flow): if a user reported a pain
// rating ≥ 7 on a routine, the routine's sort weight drops so it surfaces
// lower in future suggestions. This is a soft penalty — the routine is
// still reachable via the library, matching the rule's "deprioritise, do
// not hide" wording. A hard hide would interfere with the user's explicit
// choice to revisit a routine they know caused soreness.

type PainSessionRow = {
  routineId: string | null
  painFeedback: Record<string, number> | null | undefined
}

/**
 * Returns the set of `routineId`s that recorded a high-tier pain rating
 * in the supplied session history. Pure and side-effect-free so it can
 * be unit-tested without the DB.
 */
export function routinesWithHighPainHistory(
  sessions: PainSessionRow[],
): Set<string> {
  const ids = new Set<string>()
  for (const s of sessions) {
    if (!s.routineId) continue
    if (sessionHadHighPain(s.painFeedback)) ids.add(s.routineId)
  }
  return ids
}

// ─── Preference-based routine suggestion ─────────────────────────────────────

export async function suggestRoutinesForUser(
  userId: string,
  goals: string[],
  focusAreas: BodyArea[],
  sessionHistory: PainSessionRow[] = [],
) {
  const targetAreas = new Set<BodyArea>();
  for (const goal of goals) {
    (GOAL_BODY_AREAS[goal] ?? []).forEach((a) => targetAreas.add(a));
  }
  focusAreas.forEach((a) => targetAreas.add(a));

  const all = await db.query.routines.findMany({
    orderBy: (r, { desc }) => [desc(r.createdAt)],
    limit: 50,
  });

  // Simple ranking: prefer matching goal
  const ranked = all.filter((r) => goals.includes(r.goal));

  // Deprioritise routines the user has already reported high pain on.
  // Stable sort: within the same pain-history bucket, preserve the
  // createdAt-desc order returned by Drizzle.
  const penalised = routinesWithHighPainHistory(sessionHistory);
  const ordered = [...ranked].sort((a, b) => {
    const aPenalty = penalised.has(a.id) ? 1 : 0;
    const bPenalty = penalised.has(b.id) ? 1 : 0;
    return aPenalty - bPenalty;
  });

  return ordered.slice(0, 6);
}
