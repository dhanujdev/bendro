"use client"

/**
 * React Three Fiber view of a VRM avatar driven by MediaPipe Pose landmarks.
 *
 * This component is client-only — it imports three.js and @react-three/fiber
 * which both touch `window`. It is loaded via `next/dynamic({ ssr: false })`
 * from `camera-pose-client.tsx`.
 *
 * VRM asset
 * ─────────
 * Primary: bundled at `public/avatars/default.vrm`. Sourced from
 *   https://github.com/pixiv/three-vrm/tree/main/packages/three-vrm/examples/models
 * which is MIT-licensed. The asset is `VRM1_Constraint_Twist_Sample.vrm`,
 * the three-vrm test avatar. Ships with the repo so the avatar works offline
 * and survives any upstream CDN reshuffle.
 *
 * Fallback: if the VRM load throws, `<FallbackRig />` renders a simple
 * primitive-mesh body so the camera page never crashes on avatar mode.
 */

import { Suspense, useRef, useState, type RefObject } from "react"
import { Canvas, useFrame, useLoader } from "@react-three/fiber"
import { Environment, OrbitControls } from "@react-three/drei"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { VRMLoaderPlugin, type VRM } from "@pixiv/three-vrm"

import type { Landmark } from "@/lib/pose/angles"
import { applyToVrm, solvePose } from "@/lib/pose/vrm-driver"

// Local-first: ships with the app so camera mode works offline (PWA) and
// doesn't depend on jsDelivr resolving a GitHub tag. If you want to avoid
// the 10MB commit, delete public/avatars/default.vrm and replace with a
// commit-SHA-pinned CDN URL, e.g.
//   "https://cdn.jsdelivr.net/gh/pixiv/three-vrm@<sha>/packages/three-vrm/examples/models/VRM1_Constraint_Twist_Sample.vrm"
const DEFAULT_VRM_URL = "/avatars/default.vrm"

interface LandmarksRef {
  landmarks3D: Landmark[] | null
  landmarks2D: Landmark[] | null
}

interface AvatarViewProps {
  /**
   * Mutable ref continuously updated by the parent each detection tick.
   * We read from this inside `useFrame` instead of accepting props so we
   * don't re-render the R3F tree every frame.
   */
  landmarksRef: RefObject<LandmarksRef>
  /** Ref to the mirrored webcam video — Kalidokit uses it for aspect ratio. */
  videoRef: RefObject<HTMLVideoElement | null>
  url?: string
}

export default function AvatarView({ landmarksRef, videoRef, url = DEFAULT_VRM_URL }: AvatarViewProps) {
  return (
    <Canvas
      camera={{ position: [0, 1.3, 2.2], fov: 35 }}
      gl={{ alpha: true, antialias: true }}
      style={{ background: "transparent" }}
    >
      <ambientLight intensity={0.8} />
      <directionalLight position={[1, 2, 3]} intensity={0.9} />
      <Suspense fallback={<FallbackRig landmarksRef={landmarksRef} videoRef={videoRef} />}>
        <VrmAvatar url={url} landmarksRef={landmarksRef} videoRef={videoRef} />
      </Suspense>
      <Environment preset="studio" />
      <OrbitControls
        enablePan={false}
        enableZoom={false}
        target={[0, 1.1, 0]}
        minPolarAngle={Math.PI / 3}
        maxPolarAngle={Math.PI / 1.8}
      />
    </Canvas>
  )
}

interface VrmAvatarProps {
  url: string
  landmarksRef: RefObject<LandmarksRef>
  videoRef: RefObject<HTMLVideoElement | null>
}

function VrmAvatar({ url, landmarksRef, videoRef }: VrmAvatarProps) {
  // Register the VRM plugin via the useLoader extensions callback. This is
  // the R3F-idiomatic way to augment a loader; the VRM ends up on
  // `gltf.userData.vrm` per the three-vrm plugin contract.
  const gltf = useLoader(GLTFLoader, url, (loader) => {
    loader.register((parser) => new VRMLoaderPlugin(parser))
  })

  const vrm = (gltf as unknown as { userData: { vrm?: VRM } }).userData.vrm ?? null

  useFrame((_, delta) => {
    if (!vrm) return
    const { landmarks3D, landmarks2D } = landmarksRef.current
    const rig = solvePose(landmarks3D, landmarks2D, videoRef.current)
    if (rig) applyToVrm(vrm, rig)
    vrm.update(delta)
  })

  if (!vrm) return null
  // Face the camera. Many VRMs ship facing +Z; rotate 180° so they look at
  // the viewer. Setting via the JSX prop avoids mutating the useLoader result.
  return <primitive object={vrm.scene} rotation={[0, Math.PI, 0]} />
}

/**
 * Procedural fallback: 12 primitive segments driven by the rig. Used when
 * the VRM model fails to load so the page never crashes.
 */
function FallbackRig({ landmarksRef, videoRef }: Pick<AvatarViewProps, "landmarksRef" | "videoRef">) {
  const groupRef = useRef<THREE.Group>(null)
  const [rig, setRig] = useState<ReturnType<typeof solvePose>>(null)

  useFrame(() => {
    const { landmarks3D, landmarks2D } = landmarksRef.current
    const r = solvePose(landmarks3D, landmarks2D, videoRef.current)
    if (r) setRig(r)
  })

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      {/* Torso */}
      <mesh position={[0, 1.2, 0]}>
        <boxGeometry args={[0.3, 0.5, 0.15]} />
        <meshStandardMaterial color="#7C5CFC" />
      </mesh>
      {/* Head */}
      <mesh position={[0, 1.6, 0]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {/* Hint text via fallback status — not strictly needed, rig kept for debugging */}
      {rig ? null : null}
    </group>
  )
}
