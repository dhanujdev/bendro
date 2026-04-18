/**
 * In-memory mock data, shape-matched to the foundation Zod schemas in
 * `src/types/`. Used by the API routes when `DATABASE_URL` isn't configured.
 *
 * When you wire up Neon + run `pnpm db:migrate && pnpm db:seed`, you can
 * swap the API routes to call `src/services/*` directly and delete this file.
 */

import type {
  StretchType,
  RoutineType,
  RoutineWithStretches,
  SessionType,
  StartSession,
  Goal,
} from "@/types"

// Stable UUIDs so routines can reference stretches deterministically.
const ID = {
  neckTilt: "11111111-1111-4000-8000-000000000001",
  chestOpener: "11111111-1111-4000-8000-000000000002",
  catCow: "11111111-1111-4000-8000-000000000003",
  hipFlexor: "11111111-1111-4000-8000-000000000004",
  forwardFold: "11111111-1111-4000-8000-000000000005",
  childPose: "11111111-1111-4000-8000-000000000006",
  quadStretch: "11111111-1111-4000-8000-000000000007",
  shoulderCross: "11111111-1111-4000-8000-000000000008",

  morningFlow: "22222222-2222-4000-8000-000000000001",
  deskReset: "22222222-2222-4000-8000-000000000002",
  lowerBackRelief: "22222222-2222-4000-8000-000000000003",
  postWorkout: "22222222-2222-4000-8000-000000000004",
  bedtime: "22222222-2222-4000-8000-000000000005",
  demo: "22222222-2222-4000-8000-000000000006",
} as const

const NOW = new Date("2024-01-01T00:00:00Z")

// ─── Stretches ────────────────────────────────────────────────────────────────

export const MOCK_STRETCHES: StretchType[] = [
  {
    id: ID.neckTilt,
    slug: "neck-side-tilt",
    name: "Neck Side Tilt",
    instructions:
      "Sit tall with shoulders relaxed. Slowly tilt your right ear toward your right shoulder. Hold 15 seconds, feeling the stretch on the left side of your neck. Return to center, then repeat on the other side.",
    cues: ["Shoulders down and away from ears", "Breathe slowly through the nose"],
    cautions: ["Stop immediately if you feel sharp pain"],
    bodyAreas: ["neck"],
    intensity: "gentle",
    bilateral: true,
    defaultDurationSec: 30,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.chestOpener,
    slug: "doorway-chest-opener",
    name: "Doorway Chest Opener",
    instructions:
      "Stand in a doorway with arms at 90 degrees. Place forearms on the frame. Gently step forward until you feel a stretch across your chest. Hold, breathing deeply.",
    cues: ["Keep core engaged", "Don't arch the lower back"],
    cautions: ["Skip if you have a shoulder impingement"],
    bodyAreas: ["chest", "shoulders"],
    intensity: "moderate",
    bilateral: false,
    defaultDurationSec: 45,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.catCow,
    slug: "cat-cow",
    name: "Cat-Cow Stretch",
    instructions:
      "Start on hands and knees. Inhale: drop belly, lift head and tailbone (Cow). Exhale: round spine to ceiling (Cat). Flow with your breath for 10 cycles.",
    cues: ["Move with the breath", "Keep shoulders away from ears"],
    cautions: [],
    bodyAreas: ["upper_back", "lower_back"],
    intensity: "gentle",
    bilateral: false,
    defaultDurationSec: 60,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.hipFlexor,
    slug: "hip-flexor-lunge",
    name: "Hip Flexor Lunge",
    instructions:
      "Step right foot forward into a lunge. Lower left knee to the floor. Shift weight forward until you feel a stretch in the front of the left hip. Hold 30 seconds, then switch.",
    cues: ["Square hips forward", "Keep front knee over ankle"],
    cautions: ["Place padding under the back knee"],
    bodyAreas: ["hips", "quads"],
    intensity: "moderate",
    bilateral: true,
    defaultDurationSec: 60,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.forwardFold,
    slug: "seated-forward-fold",
    name: "Seated Forward Fold",
    instructions:
      "Sit with legs extended straight. Inhale and lengthen the spine. Exhale and hinge forward from the hips, reaching toward your feet. Hold, breathing deeply.",
    cues: ["Lead with the chest, not the head", "Micro-bend the knees if needed"],
    cautions: ["Skip if you have a disc injury"],
    bodyAreas: ["hamstrings", "lower_back"],
    intensity: "gentle",
    bilateral: false,
    defaultDurationSec: 45,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.childPose,
    slug: "childs-pose",
    name: "Child's Pose",
    instructions:
      "Kneel and sit back on your heels. Fold forward, extending arms in front. Rest forehead on the mat. Breathe deeply.",
    cues: ["Relax the jaw and shoulders", "Let the belly rest on the thighs"],
    cautions: ["Place a block under forehead if it doesn't reach"],
    bodyAreas: ["lower_back", "hips"],
    intensity: "gentle",
    bilateral: false,
    defaultDurationSec: 60,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.quadStretch,
    slug: "standing-quad-stretch",
    name: "Standing Quad Stretch",
    instructions:
      "Stand on left foot. Bend right knee and grab the right ankle behind you. Pull heel toward glutes. Hold 15 seconds, then switch.",
    cues: ["Keep knees close together", "Engage core for balance"],
    cautions: ["Hold a wall if balance is wobbly"],
    bodyAreas: ["quads"],
    intensity: "moderate",
    bilateral: true,
    defaultDurationSec: 30,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.shoulderCross,
    slug: "shoulder-cross-stretch",
    name: "Shoulder Cross Stretch",
    instructions:
      "Bring right arm across the chest. Use left hand to press it gently toward the body. Hold 15 seconds, then switch.",
    cues: ["Keep shoulders down", "Don't rotate the spine"],
    cautions: [],
    bodyAreas: ["shoulders"],
    intensity: "gentle",
    bilateral: true,
    defaultDurationSec: 30,
    mediaUrl: null,
    thumbnailUrl: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

const byId = (id: string) => MOCK_STRETCHES.find((s) => s.id === id)!

// ─── Routines ─────────────────────────────────────────────────────────────────

export const MOCK_ROUTINES: RoutineType[] = [
  {
    id: ID.morningFlow,
    slug: "morning-wake-up-flow",
    title: "Morning Wake-Up Flow",
    description: "Gently wake your body with this energizing morning routine.",
    goal: "mobility",
    level: "gentle",
    totalDurationSec: 240,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.deskReset,
    slug: "desk-worker-relief",
    title: "Desk Worker Relief",
    description: "Combat the effects of sitting all day with this targeted routine.",
    goal: "posture",
    level: "moderate",
    totalDurationSec: 165,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.lowerBackRelief,
    slug: "lower-back-relief",
    title: "Lower Back Relief",
    description: "Targeted stretches to ease lower back tension and discomfort.",
    goal: "pain_relief",
    level: "gentle",
    totalDurationSec: 285,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.postWorkout,
    slug: "post-workout-recovery",
    title: "Post-Workout Recovery",
    description: "Cool down and recover after exercise with deep muscle stretches.",
    goal: "recovery",
    level: "deep",
    totalDurationSec: 300,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.bedtime,
    slug: "bedtime-wind-down",
    title: "Bedtime Wind Down",
    description: "Prepare your body and mind for restful sleep.",
    goal: "stress_relief",
    level: "gentle",
    totalDurationSec: 195,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
  {
    id: ID.demo,
    slug: "quick-full-body-stretch",
    title: "Quick Full-Body Stretch",
    description: "A fast, balanced routine for any time of day.",
    goal: "flexibility",
    level: "moderate",
    totalDurationSec: 195,
    isPremium: false,
    isAiGenerated: false,
    ownerId: null,
    createdAt: NOW,
    updatedAt: NOW,
  },
]

// Helper to build a routine_stretches row
function rs(
  routineId: string,
  stretchId: string,
  order: number,
  durationSec?: number,
) {
  const s = byId(stretchId)
  // Deterministic UUIDv4-shaped id: "44444444-4444-4rrr-8000-oooooooooooo"
  // where rrr = routineId byte, ooo = order. Valid hex, valid UUID layout.
  const routineByte = routineId.slice(0, 2)
  const orderHex = order.toString(16).padStart(12, "0")
  const id = `44444444-4444-4${routineByte}0-8000-${orderHex}`
  return {
    id,
    routineId,
    stretchId,
    orderIndex: order,
    durationSec: durationSec ?? s.defaultDurationSec,
    sideFirst: null,
    stretch: {
      id: s.id,
      slug: s.slug,
      name: s.name,
      instructions: s.instructions,
      cues: s.cues,
      cautions: s.cautions,
      bodyAreas: s.bodyAreas,
      intensity: s.intensity,
      bilateral: s.bilateral,
      defaultDurationSec: s.defaultDurationSec,
      mediaUrl: s.mediaUrl,
      thumbnailUrl: s.thumbnailUrl,
    },
  }
}

export const MOCK_ROUTINE_STRETCHES: Record<string, RoutineWithStretches> = {
  [ID.morningFlow]: {
    ...MOCK_ROUTINES[0],
    routineStretches: [
      rs(ID.morningFlow, ID.neckTilt, 0),
      rs(ID.morningFlow, ID.catCow, 1),
      rs(ID.morningFlow, ID.hipFlexor, 2),
      rs(ID.morningFlow, ID.childPose, 3),
      rs(ID.morningFlow, ID.quadStretch, 4),
    ],
  },
  [ID.deskReset]: {
    ...MOCK_ROUTINES[1],
    routineStretches: [
      rs(ID.deskReset, ID.neckTilt, 0),
      rs(ID.deskReset, ID.chestOpener, 1),
      rs(ID.deskReset, ID.shoulderCross, 2),
      rs(ID.deskReset, ID.catCow, 3),
    ],
  },
  [ID.lowerBackRelief]: {
    ...MOCK_ROUTINES[2],
    routineStretches: [
      rs(ID.lowerBackRelief, ID.childPose, 0),
      rs(ID.lowerBackRelief, ID.catCow, 1),
      rs(ID.lowerBackRelief, ID.hipFlexor, 2),
      rs(ID.lowerBackRelief, ID.forwardFold, 3),
      rs(ID.lowerBackRelief, ID.childPose, 4),
    ],
  },
  [ID.postWorkout]: {
    ...MOCK_ROUTINES[3],
    routineStretches: [
      rs(ID.postWorkout, ID.forwardFold, 0),
      rs(ID.postWorkout, ID.hipFlexor, 1),
      rs(ID.postWorkout, ID.quadStretch, 2),
      rs(ID.postWorkout, ID.chestOpener, 3),
      rs(ID.postWorkout, ID.catCow, 4),
      rs(ID.postWorkout, ID.childPose, 5),
    ],
  },
  [ID.bedtime]: {
    ...MOCK_ROUTINES[4],
    routineStretches: [
      rs(ID.bedtime, ID.childPose, 0),
      rs(ID.bedtime, ID.catCow, 1),
      rs(ID.bedtime, ID.forwardFold, 2),
      rs(ID.bedtime, ID.neckTilt, 3),
    ],
  },
  [ID.demo]: {
    ...MOCK_ROUTINES[5],
    routineStretches: [
      rs(ID.demo, ID.neckTilt, 0),
      rs(ID.demo, ID.catCow, 1),
      rs(ID.demo, ID.hipFlexor, 2),
      rs(ID.demo, ID.forwardFold, 3),
    ],
  },
}

// Short-friendly slug lookup for player routes (/player/demo, /player/morning-wake-up-flow, …).
export function findRoutineByIdOrSlug(idOrSlug: string): RoutineWithStretches | null {
  if (MOCK_ROUTINE_STRETCHES[idOrSlug]) return MOCK_ROUTINE_STRETCHES[idOrSlug]
  // Convenience: /player/demo -> routine with slug "quick-full-body-stretch"
  if (idOrSlug === "demo") return MOCK_ROUTINE_STRETCHES[ID.demo]
  const hit = MOCK_ROUTINES.find((r) => r.slug === idOrSlug)
  return hit ? MOCK_ROUTINE_STRETCHES[hit.id] : null
}

// ─── Sessions (in-memory) ─────────────────────────────────────────────────────

const DEMO_USER_ID = "00000000-0000-4000-8000-000000000001"
let sessionCounter = 1
const sessionStore: SessionType[] = []

function uuid(suffix: number): string {
  return `33333333-3333-4000-8000-${String(suffix).padStart(12, "0")}`
}

export function createMockSession(input: StartSession): SessionType {
  const session: SessionType = {
    id: uuid(sessionCounter++),
    userId: input.userId || DEMO_USER_ID,
    routineId: input.routineId,
    startedAt: new Date(),
    completedAt: null,
    durationDoneSec: 0,
    completionPct: 0,
    skippedStretchIds: [],
    painFeedback: {},
    createdAt: new Date(),
  }
  sessionStore.push(session)
  return session
}

export function updateMockSession(
  id: string,
  patch: Partial<Pick<SessionType, "durationDoneSec" | "completionPct" | "skippedStretchIds" | "painFeedback" | "completedAt">>,
): SessionType | null {
  const idx = sessionStore.findIndex((s) => s.id === id)
  if (idx === -1) return null
  sessionStore[idx] = { ...sessionStore[idx], ...patch }
  return sessionStore[idx]
}

export function findMockSession(id: string): SessionType | null {
  return sessionStore.find((s) => s.id === id) ?? null
}

// ─── Progress ────────────────────────────────────────────────────────────────

export interface MockProgress {
  currentStreak: number
  longestStreak: number
  totalSessions: number
  totalMinutes: number
  thisWeekMinutes: number
  thisMonthMinutes: number
  avgCompletionPct: number
  activeDays: string[]
  history: Array<{
    date: string
    minutesStretched: number
    sessionsCompleted: number
    completionPct: number
  }>
}

export const MOCK_PROGRESS: MockProgress = {
  currentStreak: 5,
  longestStreak: 12,
  totalSessions: 42,
  totalMinutes: 347,
  thisWeekMinutes: 48,
  thisMonthMinutes: 156,
  avgCompletionPct: 87,
  activeDays: ["monday", "wednesday", "friday", "saturday"],
  history: Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const hasActivity = Math.random() > 0.4
    return {
      date: date.toISOString().split("T")[0],
      minutesStretched: hasActivity ? Math.floor(Math.random() * 20) + 5 : 0,
      sessionsCompleted: hasActivity ? Math.floor(Math.random() * 2) + 1 : 0,
      completionPct: hasActivity ? Math.floor(Math.random() * 30) + 70 : 0,
    }
  }),
}

// ─── Goal display helpers ────────────────────────────────────────────────────

export const GOAL_META: Record<Goal, { label: string; emoji: string }> = {
  flexibility: { label: "Flexibility", emoji: "🤸" },
  mobility: { label: "Mobility", emoji: "☀️" },
  recovery: { label: "Recovery", emoji: "💪" },
  stress_relief: { label: "Stress Relief", emoji: "🌙" },
  posture: { label: "Posture", emoji: "💻" },
  athletic_performance: { label: "Athletic", emoji: "⚡" },
  pain_relief: { label: "Pain Relief", emoji: "🧘" },
}
