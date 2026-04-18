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
 * Smoothing alpha used when applying rig rotations. Higher = snappier but
 * jitterier; lower = smoother but laggy. 0.3 is a good middle ground per
 * Kalidokit's own demos.
 */
const SMOOTH_ALPHA = 0.4

const _euler = new THREE.Euler()
const _targetQuat = new THREE.Quaternion()

/**
 * Set a single bone's local rotation with per-frame lerp toward the target
 * Euler. Operates on a normalized VRM bone — the humanoid's normalization
 * hides skeleton-specific rest poses from us.
 */
function applyBone(
  vrm: VRM,
  boneName: Parameters<VRM["humanoid"]["getNormalizedBoneNode"]>[0],
  target: XYZ | undefined,
  alpha = SMOOTH_ALPHA,
) {
  if (!target) return
  const bone = vrm.humanoid.getNormalizedBoneNode(boneName)
  if (!bone) return

  _euler.set(target.x ?? 0, target.y ?? 0, target.z ?? 0)
  _targetQuat.setFromEuler(_euler)
  bone.quaternion.slerp(_targetQuat, alpha)
}

/**
 * Apply a solved Kalidokit pose rig to a VRM avatar.
 *
 * Kalidokit returns Euler-ish `{x, y, z}` vectors (and one special Hips
 * object) in Kalidokit's own axis convention. Empirically this maps 1:1 to
 * VRM's normalized bones for the main trunk + limbs. If poses look
 * backwards/inverted swap the Left/Right assignments here.
 */
export function applyToVrm(vrm: VRM, rig: Rig) {
  if (!vrm.humanoid) return

  // Torso / spine chain
  if (hasXYZ(rig.Spine)) {
    applyBone(vrm, "spine", rig.Spine)
    applyBone(vrm, "chest", rig.Spine, SMOOTH_ALPHA * 0.6)
  }

  if (rig.Hips?.rotation) {
    const r = rig.Hips.rotation as XYZ
    applyBone(vrm, "hips", r)
  }

  // Arms
  applyBone(vrm, "leftUpperArm", rig.LeftUpperArm as XYZ)
  applyBone(vrm, "leftLowerArm", rig.LeftLowerArm as XYZ)
  applyBone(vrm, "rightUpperArm", rig.RightUpperArm as XYZ)
  applyBone(vrm, "rightLowerArm", rig.RightLowerArm as XYZ)

  // Hands (wrist rotation — rig.*Hand is a Vector-like XYZ)
  applyBone(vrm, "leftHand", rig.LeftHand as XYZ)
  applyBone(vrm, "rightHand", rig.RightHand as XYZ)

  // Legs
  if (hasXYZ(rig.LeftUpperLeg)) applyBone(vrm, "leftUpperLeg", rig.LeftUpperLeg)
  if (hasXYZ(rig.LeftLowerLeg)) applyBone(vrm, "leftLowerLeg", rig.LeftLowerLeg)
  if (hasXYZ(rig.RightUpperLeg)) applyBone(vrm, "rightUpperLeg", rig.RightUpperLeg)
  if (hasXYZ(rig.RightLowerLeg)) applyBone(vrm, "rightLowerLeg", rig.RightLowerLeg)
}
