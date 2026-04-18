# ADR-0003: Pose Solver Stays Client-Side Behind a Single Boundary

**Status:** Accepted
**Date:** 2026-04-18
**Deciders:** architect, security-lead, frontend-lead
**Related:** `.claude/rules/HEALTH_RULES.md`, `.claude/rules/SECURITY_RULES.md`

---

## Context

The player renders a live camera feed, detects body landmarks with
MediaPipe Tasks Vision, solves joint angles (Kalidokit), and drives a VRM
avatar. The full pipeline is:

```
Camera → MediaPipe pose landmarker → pose/landmarks.ts → pose/angles.ts
       → pose/vrm-driver.ts → VRM bones → react-three-fiber scene
```

Two independent concerns constrain where this code may live:

1. **Privacy / legal.** Recording someone's body is sensitive. Pose
   landmarks can identify body proportions; video frames carry face +
   environment. Any server-side handling trips us into GDPR special
   category territory and may raise HIPAA questions if used for diagnosis.
   `HEALTH_RULES.md` is explicit: frames and landmarks never leave the
   device in v1.

2. **Swappability.** MediaPipe, Kalidokit, and the VRM runtime are
   evolving quickly. We need to be able to replace any one of them
   without refactoring the player UI or the avatar scene.

## Decision

The pose pipeline lives **entirely on the client**, behind a single
boundary at `src/lib/pose/*`:

```
src/lib/pose/
├── landmarks.ts   MediaPipe landmark constants (pure data)
├── angles.ts      Pure joint-angle math (no SDK dependency)
└── vrm-driver.ts  Maps angles → VRM bone rotations; ONLY this file imports the VRM runtime
```

Player components (`src/app/player/camera/_components/*`) consume this
boundary. No other directory may import `@mediapipe/*`, pose detection
SDKs, or the VRM runtime.

### Invariants enforced

- **No server-side pose code.** `pre-pr-gate.py` Gate 3 blocks `@mediapipe`
  imports outside `src/lib/pose/` and `src/app/player/`.
- **No network egress of frames or landmarks.** Reviewed in every PR that
  touches the player.
- **Single swappable boundary.** `vrm-driver.ts` is the only file that
  couples to VRM internals. Swapping to a different avatar runtime means
  replacing that one file.

## Consequences

**Positive:**
- Privacy invariant is provable by a grep: if no server file imports
  MediaPipe, pose data cannot leak.
- MediaPipe version bumps or swaps to MoveNet stay within `src/lib/pose/`.
- VRM ↔ Rive ↔ custom rig swap is localized to one file.
- `HEALTH_RULES.md` camera/privacy clause is mechanically enforced.

**Negative:**
- Users who need server-side form feedback (e.g., "your back is rounded")
  can't get it without reopening this decision.
- Client bundle carries MediaPipe weights; larger load cost on the player
  route. Mitigation: defer load; gate behind explicit user action on
  player open; cache via service worker (Phase 10).

**Neutral:**
- A future feature could ship pose summaries (aggregate statistics, not
  landmarks) to the server. That is allowed but requires a superseding
  ADR explicitly carving out the data shape + consent flow.

## Revisit Triggers

Reopen this decision if:

1. A feature genuinely requires server-side pose analysis. Must include:
   - Written consent UX.
   - Data retention policy.
   - Legal review (HIPAA / GDPR).
2. Pose detection accuracy on-device becomes insufficient for the product
   vision → consider server-side refinement of landmarks only (not frames).
3. MediaPipe is deprecated or its license changes.

## Implementation Status

- `src/lib/pose/landmarks.ts` — present, pure data.
- `src/lib/pose/angles.ts` — present, pure math.
- `src/lib/pose/vrm-driver.ts` — present, current single consumer of VRM runtime.
- `src/app/player/camera/_components/camera-pose-client.tsx` — present,
  owns the camera + canvas + pose loop.
- `src/app/player/camera/_components/avatar-view.tsx` — present,
  mirrors pose to the VRM.

---

## References

- `CLAUDE.md` §5, §7
- `.claude/rules/HEALTH_RULES.md` (Camera & Pose Privacy)
- `.claude/rules/SECURITY_RULES.md` (camera/media)
- `.claude/rules/ARCHITECTURE_RULES.md`
