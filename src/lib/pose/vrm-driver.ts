/**
 * VRM driver: translate MediaPipe Pose Landmarker results into VRM humanoid
 * bone rotations via Kalidokit.
 *
 * ─── Swap plan ────────────────────────────────────────────────────────────
 * Kalidokit is deprecated upstream (the author hands the problem back to
 * Google, which is expected to ship a first-party MediaPipe avatar solver).
 * Every Kalidokit touchpoint lives in this file so the migration is a
 * single-module change:
 *
 *   1. Replace the `import * as Kalidokit` line with the new solver.
 *   2. Rewrite `solvePose()` to return the same `Rig` shape we consume in
 *      `applyToVrm()` — or update `applyToVrm()` if the new solver's output
 *      is already VRM-compatible (e.g. named bone quaternions).
 *   3. Rebuild. `avatar-view.tsx` imports this module as a contract, it
 *      doesn't know or care which solver is underneath.
 *
 * Candidate replacements (2026 options):
 *   - MediaPipe's own BlazePose → bone solver when Google ships it.
 *   - Three.js IK (CCD / FABRIK) driven directly by world landmarks.
 *   - Custom quaternion mapping (simpler joints, no external dep).
 *
 * Until then, Kalidokit works fine against MediaPipe Tasks Vision output.
 */

import * as Kalidokit from "kalidokit"
import * as THREE from "three"
import type { VRM } from "@pixiv/three-vrm"

import type { Landmark } from "./angles"
import { DEFAULT_MAX_ANGULAR_VELOCITY, velocityClampedSlerpT } from "./smoothing"

export type Rig = NonNullable<ReturnType<typeof Kalidokit.Pose.solve>>

type XYZ = { x: number; y: number; z: number }

function hasXYZ(v: unknown): v is XYZ {
  if (!v || typeof v !== "object") return false
  const o = v as Record<string, unknown>
  return typeof o.x === "number" && typeof o.y === "number" && typeof o.z === "number"
}

/**
 * Convert a MediaPipe Tasks Vision `NormalizedLandmark[]` into Kalidokit's
 * expected `TFVectorPose` shape. Kalidokit wants `{x, y, z}` entries, which
 * is already the shape MediaPipe returns — this helper is just a typed
 * identity for now but centralises the contract.
 */
function toKalidokitLandmarks(lms: Landmark[]): Array<{ x: number; y: number; z: number }> {
  return lms.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z ?? 0 }))
}

/**
 * Run Kalidokit.Pose.solve against both 3D (world) and 2D (image) landmarks.
 * Returns `null` if landmarks are missing or the solver returns undefined.
 */
export function solvePose(
  landmarks3D: Landmark[] | null,
  landmarks2D: Landmark[] | null,
  video: HTMLVideoElement | null,
): Rig | null {
  if (!landmarks3D || !landmarks2D) return null
  if (landmarks3D.length < 33 || landmarks2D.length < 33) return null

  const lm3d = toKalidokitLandmarks(landmarks3D)
  const lm2d = toKalidokitLandmarks(landmarks2D)

  const rig = Kalidokit.Pose.solve(lm3d, lm2d, {
    runtime: "mediapipe",
    video: video ?? undefined,
    enableLegs: true,
  })

  return rig ?? null
}

/**
 * Base EMA alpha used when applying rig rotations. Higher = snappier but
 * jitterier; lower = smoother but laggy. 0.4 is tuned with Kalidokit's own
 * demos; per-frame slerp with this alpha gives a ~100ms response curve at
 * 30 Hz. The velocity clamp below composes on top — slerp `t` is always
 * the smaller of (EMA alpha) and (velocity-capped alpha).
 */
const SMOOTH_ALPHA = 0.4

// Fallback dt used if the caller doesn't pass one (pre-velocity-clamp
// call sites). Assumes 30 Hz.
const FALLBACK_DT = 1 / 30

const _euler = new THREE.Euler()
const _targetQuat = new THREE.Quaternion()

/**
 * Set a single bone's local rotation with per-frame slerp toward the target
 * Euler. Slerp amount combines EMA alpha with an angular-velocity cap so
 * single-frame landmark blips can't produce visible snaps — see
 * `./smoothing.ts` for the clamp formula.
 */
function applyBone(
  vrm: VRM,
  boneName: Parameters<VRM["humanoid"]["getNormalizedBoneNode"]>[0],
  target: XYZ | undefined,
  dt: number,
  alpha = SMOOTH_ALPHA,
) {
  if (!target) return
  const bone = vrm.humanoid.getNormalizedBoneNode(boneName)
  if (!bone) return

  _euler.set(target.x ?? 0, target.y ?? 0, target.z ?? 0)
  _targetQuat.setFromEuler(_euler)
  const distance = bone.quaternion.angleTo(_targetQuat)
  const t = velocityClampedSlerpT(distance, alpha, DEFAULT_MAX_ANGULAR_VELOCITY, dt)
  if (t <= 0) return
  bone.quaternion.slerp(_targetQuat, t)
}

/**
 * Apply a solved Kalidokit pose rig to a VRM avatar.
 *
 * `dt` is the frame delta in seconds (from R3F's `useFrame`). If omitted we
 * fall back to an assumed 30 Hz step so legacy callers don't break.
 *
 * Kalidokit returns Euler-ish `{x, y, z}` vectors (and one special Hips
 * object) in Kalidokit's own axis convention. Empirically this maps 1:1 to
 * VRM's normalized bones for the main trunk + limbs. If poses look
 * backwards/inverted swap the Left/Right assignments here.
 */
export function applyToVrm(vrm: VRM, rig: Rig, dt: number = FALLBACK_DT) {
  if (!vrm.humanoid) return

  // Torso / spine chain
  if (hasXYZ(rig.Spine)) {
    applyBone(vrm, "spine", rig.Spine, dt)
    applyBone(vrm, "chest", rig.Spine, dt, SMOOTH_ALPHA * 0.6)
  }

  if (rig.Hips?.rotation) {
    const r = rig.Hips.rotation as XYZ
    applyBone(vrm, "hips", r, dt)
  }

  // Arms
  applyBone(vrm, "leftUpperArm", rig.LeftUpperArm as XYZ, dt)
  applyBone(vrm, "leftLowerArm", rig.LeftLowerArm as XYZ, dt)
  applyBone(vrm, "rightUpperArm", rig.RightUpperArm as XYZ, dt)
  applyBone(vrm, "rightLowerArm", rig.RightLowerArm as XYZ, dt)

  // Hands (wrist rotation — rig.*Hand is a Vector-like XYZ)
  applyBone(vrm, "leftHand", rig.LeftHand as XYZ, dt)
  applyBone(vrm, "rightHand", rig.RightHand as XYZ, dt)

  // Legs
  if (hasXYZ(rig.LeftUpperLeg)) applyBone(vrm, "leftUpperLeg", rig.LeftUpperLeg, dt)
  if (hasXYZ(rig.LeftLowerLeg)) applyBone(vrm, "leftLowerLeg", rig.LeftLowerLeg, dt)
  if (hasXYZ(rig.RightUpperLeg)) applyBone(vrm, "rightUpperLeg", rig.RightUpperLeg, dt)
  if (hasXYZ(rig.RightLowerLeg)) applyBone(vrm, "rightLowerLeg", rig.RightLowerLeg, dt)
}
