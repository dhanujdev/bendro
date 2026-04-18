# Phase 10 — Player polish (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1 (continuation of the Phase-9 session)
**Lead:** frontend-lead

## Delivered

1. **Pure keyboard-decision helper** at `src/lib/player/keyboard.ts`.
   Exports `decideKeyAction({ key, phase, currentIndex, hasModifier,
   isTyping })` returning a tagged union (`"pause-toggle" | "start" |
   "next" | "previous" | "exit" | "none"`). The component dispatches
   based on the returned action. DOM-free so Vitest (node env) can cover
   it directly. Also exports `isTypingTarget()` for the component to
   detect when focus is in an input/textarea/contenteditable.

2. **Global keyboard shortcut layer on `PlayerClient`.**
   - `Space` — toggle pause while stretching; start while ready/rest.
   - `ArrowRight` — skip to next stretch (or advance from rest).
   - `ArrowLeft` — go back to the previous stretch (no-op on first).
   - `Escape` — exit to `/home`.
   All shortcuts are neutralised by modifier keys (Cmd/Ctrl/Alt) and by
   focus being inside a text input, matching the browser's idiomatic
   shortcut-suppression behaviour.

3. **Per-stretch completion burst** at
   `src/app/player/_components/stretch-completion-burst.tsx`. A
   `framer-motion` overlay: a ring pulse + scaling check icon, 500 ms
   total. Gated on `useReducedMotion()` — returns `null` immediately
   when a user prefers reduced motion so nothing animates. The player
   effect that watches `timeLeft <= 0` also branches on reduced motion:
   advance after `0ms` instead of `500ms`, so reduced-motion users don't
   see an awkward static frame.

4. **Mobile layout pass on `PlayerClient`.**
   - Replaced `min-h-screen` with `min-h-dvh` everywhere (fixes iOS
     Safari address-bar shrinkage).
   - Added `pt-[calc(3rem+env(safe-area-inset-top))]` and
     `pb-[calc(2rem+env(safe-area-inset-bottom))]` on every phase
     container.
   - Exit `X` and stretching-view exit both got `-m-2 p-2` so the tap
     target is ≥44 px while the icon stays visually 20 px.
   - Added a `data-testid="player-previous"` SkipBack button mirroring
     the skip-forward control — arrow-key behaviour and the on-screen
     control agree.
   - Added a keyboard-hint subtitle under the transport controls,
     `hidden sm:block`, so mobile users never see it.

5. **Camera overlay polish** at
   `src/app/player/camera/_components/camera-pose-client.tsx`.
   - Rewrote all six phase overlays (Idle, Loading, Unsupported, NoCamera,
     Denied, Error) with `data-testid`-tagged wrappers, amber
     accent-colour for all warning states, two-paragraph copy (what went
     wrong, what to try next).
   - Added `<TrackingPill active={isTracking} />` over the mode toggle:
     green pulsing dot when MediaPipe has delivered a fresh landmark in
     the last 1.5 s, muted "Searching" dot otherwise. Driven by a
     300 ms poll on `lastPoseAtRef`, so a single missed frame doesn't
     flip the UI.
   - Fixed-overlay root now consumes all four
     `env(safe-area-inset-*)` values (notched devices in landscape).

6. **VRM bone-driver velocity-clamp smoothing.**
   - New pure helper `src/lib/pose/smoothing.ts` exporting
     `velocityClampedSlerpT(angularDistance, baseAlpha,
     maxAngularVelocity, dt)` and `DEFAULT_MAX_ANGULAR_VELOCITY = 8`
     (rad/s). Returns the `min(baseAlpha, maxStep/distance, 1)`, with
     defensive `0` returns for non-finite or non-positive inputs.
   - `src/lib/pose/vrm-driver.ts::applyBone` now computes
     `distance = bone.quaternion.angleTo(targetQuat)` and runs the
     slerp `t` through the clamp. Result: MediaPipe landmark blips can
     move a joint by at most `8 rad/s × dt` (~0.26 rad per 30 Hz frame)
     regardless of how big the target jump is, so single-frame jitter
     can't produce visible snaps.
   - `applyToVrm` takes `dt` (R3F's `useFrame` delta, seconds) with a
     `1/30` fallback for legacy callers. `avatar-view.tsx` threads the
     delta through.

7. **Unit tests.**
   - `tests/unit/player/keyboard.test.ts` — 15 tests covering modifier
     guards, typing guards, phase guards, space/arrow/escape mapping,
     and first-stretch back-arrow no-op.
   - `tests/unit/pose/smoothing.test.ts` — 12 tests covering zero /
     NaN / Infinity guards, base-alpha-wins, velocity-clamp-wins,
     linear scaling with dt, and cap at 1 (no overshoot).
   - Suite: **259 tests across 21 files, all green.**

8. **BDD scaffolds.**
   - `tests/features/player/player.feature` — 19 scenarios covering
     ready → stretching → rest → complete flow, pause/resume, skip,
     previous, escape, modifier-ignored, typing-ignored, the burst
     overlay, reduced-motion path, completion screen, and mobile
     safe-area/hint-visibility contracts. Step bindings deferred to
     Phase 14 per the project BDD convention.
   - `tests/features/player/camera.feature` — left as-is (already
     covered the camera overlays in Phase 4).

## Architecture notes

- **Testability discipline.** `keyboard.ts` and `smoothing.ts` are both
  deliberately DOM-free + three.js-free pure functions. The React
  component and the VRM driver are thin wrappers. This keeps coverage
  on the logic despite the coverage exclusions on `vrm-driver.ts` and
  the component files.
- **No new external deps.** `framer-motion` was already in the tree
  from Phase 1 (`useReducedMotion`, `AnimatePresence`). Everything else
  used is either React stdlib, Tailwind v4, or existing adapters.
- **No schema changes.** Drizzle unchanged.
- **No new feature flags.** Phase 10 is pure UX polish and is always
  enabled.

## Known lint deferrals (pre-existing, not from Phase 10)

`pnpm lint` reports 11 errors on files untouched by this phase:
- 3 parser errors in `.claude/context/templates/` (template placeholders).
- 1 `react-hooks/set-state-in-effect` on
  `camera-pose-client.tsx:96` — pre-existing since Phase 4
  (unsupported-browser detection).
- 7 `@typescript-eslint/no-explicit-any` in test files from
  Phases 1/6.

None block the phase. They will be revisited in Phase 14 when we stand
up Playwright + e2e (the camera-pose-client detection becomes a lazy
initial state then).

## Next phase

Phase 11 — Health Safety & Disclaimers (security-lead, Opus).
`src/lib/disclaimers.ts` single-source-of-truth, disclaimer rendering on
onboarding / routine start / pain-feedback flow, pain-≥7 escalation,
pre-existing-condition safety-flag enforcement in personalization. See
`docs/PHASES.md`.
