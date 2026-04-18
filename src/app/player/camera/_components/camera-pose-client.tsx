"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import { X, Camera, AlertTriangle, Loader2 } from "lucide-react"
import type { PoseLandmarker } from "@mediapipe/tasks-vision"
import { POSE_CONNECTIONS, POSE_LANDMARKS } from "@/lib/pose/landmarks"
import { angleAtJoint, isReliable, type Landmark } from "@/lib/pose/angles"

type Phase = "idle" | "loading" | "running" | "denied" | "error"
type Mode = "stick" | "avatar"

const WASM_CDN = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.34/wasm"
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task"

// Three.js + R3F only run in the browser; load the avatar viewer lazily
// with SSR disabled. See node_modules/next/dist/docs/01-app/02-guides/lazy-loading.md.
const AvatarView = dynamic(() => import("./avatar-view"), {
  ssr: false,
  loading: () => (
    <div className="absolute inset-0 flex items-center justify-center">
      <Loader2 className="size-6 text-[#7C5CFC] animate-spin" />
    </div>
  ),
})

export default function CameraPoseClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const landmarkerRef = useRef<PoseLandmarker | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const rafRef = useRef<number | null>(null)
  const lastVideoTimeRef = useRef<number>(-1)

  // Shared latest-landmarks ref consumed by <AvatarView /> each frame. Using
  // a ref avoids re-rendering the R3F canvas on every pose detection tick.
  const landmarksRef = useRef<{
    landmarks3D: Landmark[] | null
    landmarks2D: Landmark[] | null
  }>({ landmarks3D: null, landmarks2D: null })

  const [phase, setPhase] = useState<Phase>("idle")
  const [mode, setMode] = useState<Mode>("stick")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [angle, setAngle] = useState<number | null>(null)

  const teardown = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    landmarkerRef.current?.close()
    landmarkerRef.current = null
    lastVideoTimeRef.current = -1
    landmarksRef.current = { landmarks3D: null, landmarks2D: null }
  }, [])

  useEffect(() => {
    return () => teardown()
  }, [teardown])

  const startRenderLoop = useCallback(() => {
    const tick = () => {
      const video = videoRef.current
      const canvas = canvasRef.current
      const landmarker = landmarkerRef.current
      if (!video || !landmarker) return

      const ctx = canvas?.getContext("2d") ?? null

      // Match canvas to intrinsic video dimensions on first valid frame.
      if (canvas && (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight)) {
        if (video.videoWidth > 0) {
          canvas.width = video.videoWidth
          canvas.height = video.videoHeight
        }
      }

      const nowMs = performance.now()
      // Only run detection when the video has advanced to a new frame.
      if (video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime
        const result = landmarker.detectForVideo(video, nowMs)
        const landmarks = (result.landmarks?.[0] ?? null) as Landmark[] | null
        const worldLandmarks = (result.worldLandmarks?.[0] ?? null) as Landmark[] | null

        // Publish to the avatar pipeline. Kalidokit wants BOTH arrays.
        landmarksRef.current = {
          landmarks2D: landmarks,
          landmarks3D: worldLandmarks ?? landmarks,
        }

        if (ctx && canvas) {
          ctx.clearRect(0, 0, canvas.width, canvas.height)

          if (landmarks) {
            // Edges
            ctx.strokeStyle = "#7C5CFC"
            ctx.lineWidth = 4
            ctx.lineCap = "round"
            for (const [i, j] of POSE_CONNECTIONS) {
              const p = landmarks[i]
              const q = landmarks[j]
              if (!p || !q) continue
              ctx.beginPath()
              ctx.moveTo(p.x * canvas.width, p.y * canvas.height)
              ctx.lineTo(q.x * canvas.width, q.y * canvas.height)
              ctx.stroke()
            }

            // Nodes
            ctx.fillStyle = "#ffffff"
            for (const lm of landmarks) {
              ctx.beginPath()
              ctx.arc(lm.x * canvas.width, lm.y * canvas.height, 4, 0, Math.PI * 2)
              ctx.fill()
            }
          }
        }

        if (landmarks) {
          // Left-knee flexion HUD value — same math regardless of mode.
          const hip = landmarks[POSE_LANDMARKS.LEFT_HIP]
          const knee = landmarks[POSE_LANDMARKS.LEFT_KNEE]
          const ankle = landmarks[POSE_LANDMARKS.LEFT_ANKLE]
          if (hip && knee && ankle && isReliable(hip, knee, ankle)) {
            const deg = angleAtJoint(hip, knee, ankle)
            if (!Number.isNaN(deg)) setAngle(Math.round(deg))
          } else {
            setAngle(null)
          }
        } else {
          setAngle(null)
        }
      }

      rafRef.current = requestAnimationFrame(tick)
    }

    rafRef.current = requestAnimationFrame(tick)
  }, [])

  const start = useCallback(async () => {
    setPhase("loading")
    setErrorMessage(null)
    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera access requires a secure context (HTTPS or localhost).")
      }

      // Dynamic import keeps MediaPipe out of the initial client bundle.
      const { FilesetResolver, PoseLandmarker } = await import("@mediapipe/tasks-vision")
      const vision = await FilesetResolver.forVisionTasks(WASM_CDN)
      landmarkerRef.current = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numPoses: 1,
      })

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream

      const video = videoRef.current
      if (!video) throw new Error("Video element not mounted.")
      video.srcObject = stream
      await video.play()

      setPhase("running")
      startRenderLoop()
    } catch (err) {
      teardown()
      if (err instanceof DOMException && err.name === "NotAllowedError") {
        setPhase("denied")
      } else {
        setPhase("error")
        setErrorMessage(err instanceof Error ? err.message : "Unknown error")
      }
    }
  }, [startRenderLoop, teardown])

  const stop = useCallback(() => {
    teardown()
    setPhase("idle")
    setAngle(null)
  }, [teardown])

  // Memoise to keep the avatar tree stable across parent re-renders.
  const avatarView = useMemo(
    () => <AvatarView landmarksRef={landmarksRef} videoRef={videoRef} />,
    [],
  )

  return (
    <div className="fixed inset-0 bg-[#0F0F14] text-white flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 z-10">
        <Link
          href="/home"
          className="size-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X className="size-5" />
        </Link>
        <div className="text-xs font-medium text-white/50 uppercase tracking-wider">
          Camera Mode · Beta
        </div>
        <div className="size-10" />
      </header>

      {phase === "running" && (
        <div className="relative z-10 flex justify-center pb-2">
          <ModeToggle mode={mode} onChange={setMode} />
        </div>
      )}

      <div className="flex-1 relative flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          playsInline
          muted
          className="max-w-full max-h-full object-contain"
          style={{ transform: "scaleX(-1)", display: phase === "running" ? "block" : "none" }}
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 m-auto max-w-full max-h-full pointer-events-none"
          style={{
            transform: "scaleX(-1)",
            display: phase === "running" && mode === "stick" ? "block" : "none",
          }}
        />

        {phase === "running" && mode === "avatar" && (
          <div className="absolute inset-0 pointer-events-auto">{avatarView}</div>
        )}

        {phase === "idle" && <IdleOverlay onStart={start} />}
        {phase === "loading" && <LoadingOverlay />}
        {phase === "denied" && <DeniedOverlay onRetry={start} />}
        {phase === "error" && <ErrorOverlay message={errorMessage} onRetry={start} />}
      </div>

      {phase === "running" && (
        <footer className="relative z-10 px-4 py-6 flex items-center justify-between max-w-lg mx-auto w-full">
          <div>
            <div className="text-4xl font-bold tabular-nums">
              {angle !== null ? `${angle}°` : "—"}
            </div>
            <div className="text-xs text-white/50 uppercase tracking-wider mt-1">Left knee</div>
          </div>
          <button
            onClick={stop}
            className="rounded-full bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium transition-colors"
          >
            Stop
          </button>
        </footer>
      )}
    </div>
  )
}

function ModeToggle({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  return (
    <div
      role="tablist"
      aria-label="View mode"
      className="inline-flex items-center gap-1 rounded-full bg-white/10 p-1 text-xs font-medium"
    >
      <button
        role="tab"
        aria-selected={mode === "stick"}
        onClick={() => onChange("stick")}
        className={`px-4 py-1.5 rounded-full transition-colors ${
          mode === "stick" ? "bg-white text-black" : "text-white/70 hover:text-white"
        }`}
      >
        Stick Figure
      </button>
      <button
        role="tab"
        aria-selected={mode === "avatar"}
        onClick={() => onChange("avatar")}
        className={`px-4 py-1.5 rounded-full transition-colors ${
          mode === "avatar" ? "bg-white text-black" : "text-white/70 hover:text-white"
        }`}
      >
        Avatar
      </button>
    </div>
  )
}

function IdleOverlay({ onStart }: { onStart: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-md">
      <div className="size-16 rounded-full bg-[#7C5CFC]/15 flex items-center justify-center mb-6">
        <Camera className="size-7 text-[#7C5CFC]" />
      </div>
      <h1 className="text-2xl font-bold mb-2">Enable your camera</h1>
      <p className="text-white/60 text-sm mb-8 leading-relaxed">
        Bend uses your camera to track your body position and coach your stretch.
        Video never leaves your device.
      </p>
      <button
        onClick={onStart}
        className="flex items-center gap-2 rounded-full bg-[#7C5CFC] hover:bg-[#6B4EE0] px-6 py-3.5 font-semibold transition-all active:scale-95 shadow-lg shadow-[#7C5CFC]/25"
      >
        <Camera className="size-5" />
        Enable camera
      </button>
    </div>
  )
}

function LoadingOverlay() {
  return (
    <div className="flex flex-col items-center text-center px-6">
      <Loader2 className="size-8 text-[#7C5CFC] animate-spin mb-4" />
      <p className="text-white/70">Loading pose model…</p>
      <p className="text-white/40 text-xs mt-2">First load may take up to 30 seconds.</p>
    </div>
  )
}

function DeniedOverlay({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-md">
      <div className="size-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">Camera permission denied</h2>
      <p className="text-white/60 text-sm mb-6">
        Enable camera access in your browser settings, then retry.
      </p>
      <button
        onClick={onRetry}
        className="rounded-full bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium"
      >
        Try again
      </button>
    </div>
  )
}

function ErrorOverlay({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center text-center px-6 max-w-md">
      <div className="size-14 rounded-full bg-red-500/15 flex items-center justify-center mb-4">
        <AlertTriangle className="size-6 text-red-400" />
      </div>
      <h2 className="text-xl font-bold mb-2">Something went wrong</h2>
      <p className="text-white/60 text-sm mb-6 break-words">{message ?? "Unknown error."}</p>
      <button
        onClick={onRetry}
        className="rounded-full bg-white/10 hover:bg-white/20 px-5 py-2.5 text-sm font-medium"
      >
        Retry
      </button>
    </div>
  )
}
