/**
 * Joint-angle math for 2D/3D landmarks from MediaPipe Pose Landmarker.
 *
 * For a joint at point `b` with segments extending to `a` and `c`, the
 * flexion angle is the angle between vectors (b→a) and (b→c).
 *   - A straight limb (hip-knee-ankle in line) returns ~180°.
 *   - A deep bend returns a small angle (deep squat ≈ 60–90° at the knee).
 */

export interface Landmark {
  x: number
  y: number
  z?: number
  visibility?: number
}

/**
 * Angle at vertex `b`, in degrees, formed by rays b→a and b→c.
 * Works on 2D or 3D — uses z when present on all three points, ignores it
 * otherwise. Returns NaN if any vector has zero length.
 */
export function angleAtJoint(a: Landmark, b: Landmark, c: Landmark): number {
  const use3D = a.z !== undefined && b.z !== undefined && c.z !== undefined

  const ax = a.x - b.x
  const ay = a.y - b.y
  const az = use3D ? (a.z as number) - (b.z as number) : 0

  const cx = c.x - b.x
  const cy = c.y - b.y
  const cz = use3D ? (c.z as number) - (b.z as number) : 0

  const magA = Math.hypot(ax, ay, az)
  const magC = Math.hypot(cx, cy, cz)
  if (magA === 0 || magC === 0) return Number.NaN

  const dot = ax * cx + ay * cy + az * cz
  // Clamp to avoid Math.acos NaN from tiny floating-point excursions.
  const cos = Math.max(-1, Math.min(1, dot / (magA * magC)))
  return (Math.acos(cos) * 180) / Math.PI
}

/**
 * Minimum visibility threshold below which a landmark's angle reading
 * should be treated as unreliable.
 */
export const VISIBILITY_THRESHOLD = 0.5

export function isReliable(...lms: Landmark[]): boolean {
  return lms.every((lm) => (lm.visibility ?? 1) >= VISIBILITY_THRESHOLD)
}
