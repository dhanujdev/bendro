# Phase 4 — Player Stability (COMPLETED)

**Closed:** 2026-04-18
**Sessions:** 1
**Lead:** frontend-lead

## Delivered

1. **Pose math is now unit-tested.** `tests/unit/pose/angles.test.ts`
   (17 tests) covers `angleAtJoint` (2D + 3D: straight limb ~180°, right
   angle 90°, equilateral 60°, overlapping rays ~0°, zero-length vectors →
   NaN, floating-point clamping) and `isReliable` (threshold inclusive,
   missing visibility treated as fully visible, empty args vacuously true).
   `VISIBILITY_THRESHOLD = 0.5` asserted. `src/lib/pose/angles.ts` is no
   longer excluded from coverage; `vrm-driver.ts` and `landmarks.ts` remain
   excluded (heavy browser-only deps / constants file).

2. **Distinct recovery states for every failure mode** in
   `src/app/player/camera/_components/camera-pose-client.tsx`:
   - `unsupported` — detected on mount when
     `navigator.mediaDevices?.getUserMedia` is missing. Renders a friendly
     `UnsupportedOverlay` with a back-to-home link. The "Enable camera"
     button never appears on an unsupported browser.
   - `denied` — `NotAllowedError` / `SecurityError` → existing
     `DeniedOverlay` with retry.
   - `no_camera` — `NotFoundError` / `OverconstrainedError` → new
     `NoCameraOverlay` with retry ("connect a camera, then try again").
   - `error` — everything else → existing `ErrorOverlay` showing the
     underlying message + retry.
   - `loading`, `running`, `idle` unchanged.

3. **Pose detector throttled to ~30 Hz.** New `MIN_DETECT_INTERVAL_MS`
   (derived from `TARGET_FPS = 30`) gates `landmarker.detectForVideo`
   so high-refresh (120 Hz) displays no longer starve the UI thread.
   RAF loop still runs every frame; only the detector call is rate-
   limited via `lastDetectAtRef`. `teardown()` resets the timestamp so
   restarts detect on the first post-play frame.

4. **BDD scaffold** for the camera player at
   `tests/features/player/camera.feature`: idle CTA, start → loading →
   running transition, unsupported/denied/no-camera/error recovery, stop
   + cleanup, navigate-away cleanup, and a perf-contract scenario
   (throttling at 120 Hz). Step bindings deferred to Phase 14 per
   `tests/features/README.md` convention.

## Coverage

```
File                | % Stmts | % Branch | % Funcs | % Lines
--------------------|---------|----------|---------|---------
All files           |   79.65 |    74.61 |   81.89 |   79.88
 services           |    93.9 |    91.54 |   86.53 |   95.13
 lib/pose/angles.ts |   100   |   100    |   100   |   100
```

137 tests across 13 files, all green. Both global (≥70%) and service-layer
(≥85% lines) thresholds pass.

## Notes for Future Phases

- Playwright smoke (open player → consent UI → mocked accept) is deferred
  to Phase 14 along with the full E2E harness. Adding Playwright for a
  single smoke would duplicate the config + CI work that Phase 14 already
  owns. The BDD scaffold captures the contract in the meantime.
- `vrm-driver.ts` still lacks unit tests because Kalidokit + three +
  `@pixiv/three-vrm` only resolve in a browser runtime. The bone-mapping
  contract is exercised via the player route manually today; Phase 14
  Playwright covers the rendered-avatar smoke.
- High-refresh jank budget is enforced at the detector level only. If
  the canvas overlay becomes a bottleneck on 120 Hz displays, consider
  draw-time throttling next; leave RAF pumping so Three.js continues to
  smooth.

## Exit Criteria Met

- [x] `pnpm test` green (137 tests across 13 files)
- [x] `pnpm typecheck` clean
- [x] Coverage thresholds pass (global ≥70% lines, services ≥85% lines)
- [x] Camera flow has idle / loading / running / stop states (unchanged)
- [x] Unsupported, denied, no-camera, and generic-error recovery each
      render a distinct overlay with the right guidance
- [x] Pose detector throttled to ≤30 Hz regardless of display refresh
- [x] Pose-math unit tests cover 2D + 3D + edge cases
- [x] BDD scaffold for the camera player committed
- [x] `CHANGELOG.md` updated; single closeout commit

## Next Phase

**Phase 5 — DB Toggle Hardening (mock ↔ Neon)** (backend-lead, Default).
Entry criterion met.
Top backlog items: an explicit `DataAdapter` type in `src/lib/data.ts`,
`pnpm db:generate` → review → `pnpm db:migrate` flow documented against
Neon, Neon preview branching for Vercel previews, integration tests
runnable against both mock and a real Postgres (docker compose for CI).
