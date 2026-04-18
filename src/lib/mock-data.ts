import type { Stretch, Routine, RoutineWithStretches, Session, Progress } from "@/types"

export const MOCK_STRETCHES: Stretch[] = [
  {
    id: "stretch-1",
    name: "Neck Side Tilt",
    description: "Gently tilt your head to each side to release neck tension.",
    bodyArea: "neck",
    intensity: "gentle",
    durationSeconds: 30,
    instructions: [
      "Sit tall with shoulders relaxed",
      "Slowly tilt your right ear toward your right shoulder",
      "Hold for 15 seconds, feeling the stretch on the left side of your neck",
      "Return to center, then repeat on the other side",
    ],
    benefits: ["Reduces neck tension", "Improves neck mobility", "Relieves headaches"],
  },
  {
    id: "stretch-2",
    name: "Chest Opener",
    description: "Open up tight chest muscles from sitting at a desk.",
    bodyArea: "chest",
    intensity: "moderate",
    durationSeconds: 45,
    instructions: [
      "Stand in a doorway with arms at 90 degrees",
      "Place forearms on the door frame",
      "Gently lean forward until you feel a stretch across your chest",
      "Hold for 30 seconds, breathing deeply",
    ],
    benefits: ["Opens chest", "Improves posture", "Counteracts rounded shoulders"],
  },
  {
    id: "stretch-3",
    name: "Cat-Cow Stretch",
    description: "A flowing movement to mobilize the entire spine.",
    bodyArea: "back",
    intensity: "gentle",
    durationSeconds: 60,
    instructions: [
      "Start on hands and knees, wrists under shoulders, knees under hips",
      "Inhale: drop your belly, lift your head and tailbone (Cow)",
      "Exhale: round your spine toward the ceiling, tuck chin and tailbone (Cat)",
      "Flow between positions with your breath for 10 cycles",
    ],
    benefits: ["Mobilizes spine", "Relieves back tension", "Improves posture"],
  },
  {
    id: "stretch-4",
    name: "Hip Flexor Lunge",
    description: "Release tight hip flexors from prolonged sitting.",
    bodyArea: "hips",
    intensity: "moderate",
    durationSeconds: 60,
    instructions: [
      "Step your right foot forward into a lunge position",
      "Lower your left knee to the floor",
      "Shift your weight forward until you feel a stretch in the front of your left hip",
      "Hold 30 seconds, then switch sides",
    ],
    benefits: ["Releases hip flexors", "Improves hip mobility", "Reduces lower back pain"],
  },
  {
    id: "stretch-5",
    name: "Seated Forward Fold",
    description: "Lengthen the hamstrings and lower back with a seated fold.",
    bodyArea: "hamstrings",
    intensity: "gentle",
    durationSeconds: 45,
    instructions: [
      "Sit on the floor with legs extended straight",
      "Inhale and lengthen your spine",
      "Exhale and hinge forward from your hips",
      "Reach toward your feet, hold for 30 seconds",
    ],
    benefits: ["Lengthens hamstrings", "Relieves lower back", "Calms the nervous system"],
  },
  {
    id: "stretch-6",
    name: "Child's Pose",
    description: "A restorative pose for full back and shoulder relief.",
    bodyArea: "lower_back",
    intensity: "gentle",
    durationSeconds: 60,
    instructions: [
      "Kneel on the floor and sit back on your heels",
      "Fold forward, extending arms out in front",
      "Rest your forehead on the mat",
      "Breathe deeply and hold for 45–60 seconds",
    ],
    benefits: ["Relieves lower back", "Calms the mind", "Gently stretches hips"],
  },
  {
    id: "stretch-7",
    name: "Standing Quad Stretch",
    description: "Balance and stretch the front of the thigh.",
    bodyArea: "quads",
    intensity: "moderate",
    durationSeconds: 30,
    instructions: [
      "Stand on your left foot, bend your right knee",
      "Grab your right ankle with your right hand",
      "Pull heel toward your glutes until you feel a stretch",
      "Hold 15 seconds, then switch",
    ],
    benefits: ["Stretches quadriceps", "Improves balance", "Reduces knee tension"],
  },
  {
    id: "stretch-8",
    name: "Shoulder Cross Stretch",
    description: "Release tension in the posterior shoulder.",
    bodyArea: "shoulders",
    intensity: "gentle",
    durationSeconds: 30,
    instructions: [
      "Bring your right arm across your chest",
      "Use your left hand to press it gently toward your body",
      "Hold 15 seconds, feeling the stretch in the back of the shoulder",
      "Switch arms",
    ],
    benefits: ["Releases shoulder tension", "Improves shoulder mobility"],
  },
]

export const MOCK_ROUTINES: Routine[] = [
  {
    id: "routine-1",
    name: "Morning Wake-Up Flow",
    description: "Gently wake your body with this energizing morning routine.",
    goal: "morning_wakeup",
    level: "gentle",
    durationMinutes: 10,
    stretchCount: 5,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["morning", "energy", "full-body"],
  },
  {
    id: "routine-2",
    name: "Desk Worker Relief",
    description: "Combat the effects of sitting all day with this targeted routine.",
    goal: "desk_reset",
    level: "moderate",
    durationMinutes: 8,
    stretchCount: 4,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["desk", "posture", "neck", "shoulders"],
  },
  {
    id: "routine-3",
    name: "Lower Back Relief",
    description: "Targeted stretches to ease lower back tension and discomfort.",
    goal: "lower_back_relief",
    level: "gentle",
    durationMinutes: 12,
    stretchCount: 5,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["back", "relief", "gentle"],
  },
  {
    id: "routine-4",
    name: "Post-Workout Recovery",
    description: "Cool down and recover after exercise with deep muscle stretches.",
    goal: "workout_recovery",
    level: "deep",
    durationMinutes: 15,
    stretchCount: 6,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["recovery", "deep", "full-body"],
  },
  {
    id: "routine-5",
    name: "Bedtime Wind Down",
    description: "Prepare your body and mind for restful sleep.",
    goal: "sleep",
    level: "gentle",
    durationMinutes: 10,
    stretchCount: 4,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["sleep", "relaxation", "evening"],
  },
  {
    id: "routine-demo",
    name: "Quick Full-Body Stretch",
    description: "A fast, balanced routine for any time of day.",
    goal: "flexibility",
    level: "moderate",
    durationMinutes: 7,
    stretchCount: 4,
    isSystem: true,
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    tags: ["quick", "full-body", "anytime"],
  },
]

export const MOCK_ROUTINE_STRETCHES: Record<string, RoutineWithStretches> = {
  "routine-1": {
    ...MOCK_ROUTINES[0],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[0], durationSeconds: 30 },
      { order: 1, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
      { order: 2, stretch: MOCK_STRETCHES[3], durationSeconds: 60 },
      { order: 3, stretch: MOCK_STRETCHES[5], durationSeconds: 60 },
      { order: 4, stretch: MOCK_STRETCHES[6], durationSeconds: 30 },
    ],
  },
  "routine-2": {
    ...MOCK_ROUTINES[1],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[0], durationSeconds: 30 },
      { order: 1, stretch: MOCK_STRETCHES[1], durationSeconds: 45 },
      { order: 2, stretch: MOCK_STRETCHES[7], durationSeconds: 30 },
      { order: 3, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
    ],
  },
  "routine-3": {
    ...MOCK_ROUTINES[2],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[5], durationSeconds: 60 },
      { order: 1, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
      { order: 2, stretch: MOCK_STRETCHES[3], durationSeconds: 60 },
      { order: 3, stretch: MOCK_STRETCHES[4], durationSeconds: 45 },
      { order: 4, stretch: MOCK_STRETCHES[5], durationSeconds: 60 },
    ],
  },
  "routine-4": {
    ...MOCK_ROUTINES[3],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[4], durationSeconds: 45 },
      { order: 1, stretch: MOCK_STRETCHES[3], durationSeconds: 60 },
      { order: 2, stretch: MOCK_STRETCHES[6], durationSeconds: 30 },
      { order: 3, stretch: MOCK_STRETCHES[1], durationSeconds: 45 },
      { order: 4, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
      { order: 5, stretch: MOCK_STRETCHES[5], durationSeconds: 60 },
    ],
  },
  "routine-5": {
    ...MOCK_ROUTINES[4],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[5], durationSeconds: 60 },
      { order: 1, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
      { order: 2, stretch: MOCK_STRETCHES[4], durationSeconds: 45 },
      { order: 3, stretch: MOCK_STRETCHES[0], durationSeconds: 30 },
    ],
  },
  "routine-demo": {
    ...MOCK_ROUTINES[5],
    stretches: [
      { order: 0, stretch: MOCK_STRETCHES[0], durationSeconds: 30 },
      { order: 1, stretch: MOCK_STRETCHES[2], durationSeconds: 60 },
      { order: 2, stretch: MOCK_STRETCHES[3], durationSeconds: 60 },
      { order: 3, stretch: MOCK_STRETCHES[4], durationSeconds: 45 },
    ],
  },
}

const sessionStore: Session[] = []
let sessionIdCounter = 1

export function createMockSession(routineId: string): Session {
  const session: Session = {
    id: `session-${sessionIdCounter++}`,
    routineId,
    status: "active",
    currentStretchIndex: 0,
    startedAt: new Date().toISOString(),
    stretchesCompleted: 0,
  }
  sessionStore.push(session)
  return session
}

export function updateMockSession(id: string, update: Partial<Session>): Session | null {
  const idx = sessionStore.findIndex((s) => s.id === id)
  if (idx === -1) return null
  sessionStore[idx] = { ...sessionStore[idx], ...update }
  if (update.status === "completed") {
    sessionStore[idx].completedAt = new Date().toISOString()
  }
  return sessionStore[idx]
}

export const MOCK_PROGRESS: Progress = {
  currentStreak: 5,
  longestStreak: 12,
  totalMinutes: 347,
  totalSessions: 42,
  thisWeekMinutes: 48,
  thisMonthMinutes: 156,
  activeDays: ["monday", "wednesday", "friday", "saturday"],
  history: Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const hasActivity = Math.random() > 0.4
    return {
      date: date.toISOString().split("T")[0],
      minutesStretched: hasActivity ? Math.floor(Math.random() * 20) + 5 : 0,
      sessionsCompleted: hasActivity ? Math.floor(Math.random() * 2) + 1 : 0,
      routineIds: hasActivity ? ["routine-1"] : [],
    }
  }),
}
