// Angular velocity clamp for VRM bone slerp. Masks MediaPipe landmark jitter
// by capping how far a bone is allowed to rotate in a single frame, while
// preserving responsiveness when the user's real pose changes.
//
// The caller still runs a slerp EMA (base alpha) on top — this function
// returns the smaller of (base alpha) and (velocity-capped alpha), so you
// get EMA smoothing in normal flow and a hard speed limit on sudden jumps.

// Empirically tuned: ~460°/sec. Fast enough that a real limb movement
// tracks in one frame at 30 Hz, slow enough that single-frame landmark
// blips don't produce visible snaps. Per-bone overrides are cheap if we
// ever need the trunk and limbs to have different budgets.
export const DEFAULT_MAX_ANGULAR_VELOCITY = 8

export function velocityClampedSlerpT(
  angularDistance: number,
  baseAlpha: number,
  maxAngularVelocity: number,
  dt: number,
): number {
  if (!Number.isFinite(angularDistance) || angularDistance <= 0) return 0
  if (!Number.isFinite(dt) || dt <= 0) return 0
  if (!Number.isFinite(baseAlpha) || baseAlpha <= 0) return 0
  if (!Number.isFinite(maxAngularVelocity) || maxAngularVelocity <= 0) return 0
  const maxStep = maxAngularVelocity * dt
  const velocityT = Math.min(1, maxStep / angularDistance)
  return Math.min(Math.min(baseAlpha, 1), velocityT)
}
