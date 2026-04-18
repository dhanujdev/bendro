export type PlayerPhase = "ready" | "stretching" | "rest" | "complete"

export type PlayerKeyAction =
  | "pause-toggle"
  | "start"
  | "next"
  | "previous"
  | "exit"
  | "none"

export interface DecideKeyActionInput {
  key: string
  phase: PlayerPhase
  currentIndex: number
  hasModifier: boolean
  isTyping: boolean
}

// Maps a keydown event to a player action. Pure so unit tests don't need
// a DOM. The caller still dispatches the action and calls preventDefault
// when the return is anything other than "none".
export function decideKeyAction(input: DecideKeyActionInput): PlayerKeyAction {
  const { key, phase, currentIndex, hasModifier, isTyping } = input
  if (hasModifier || isTyping) return "none"
  if (phase === "complete") return "none"

  switch (key) {
    case " ":
    case "Spacebar":
      if (phase === "stretching") return "pause-toggle"
      if (phase === "ready" || phase === "rest") return "start"
      return "none"
    case "ArrowRight":
      if (phase === "stretching" || phase === "rest") return "next"
      return "none"
    case "ArrowLeft":
      if ((phase === "stretching" || phase === "rest") && currentIndex > 0) {
        return "previous"
      }
      return "none"
    case "Escape":
      return "exit"
    default:
      return "none"
  }
}

export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true
  if (target.isContentEditable) return true
  return false
}
