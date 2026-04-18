Feature: Camera Pose Player
  As a signed-in user opening Camera Mode
  I want the player to walk me through granting camera access, loading the
  pose model, tracking my movement, and letting me stop cleanly
  So that I can practice a routine with feedback without surprises.

  # ─── Pre-flight ─────────────────────────────────────────────────────────────
  Background:
    Given I am signed in
    And I navigate to "/player/camera"

  # ─── Idle / start ───────────────────────────────────────────────────────────
  Scenario: Show the idle overlay with the enable-camera CTA
    Then I see a "Enable your camera" heading
    And I see a button labelled "Enable camera"

  Scenario: Starting the camera transitions through loading to running
    When I click "Enable camera"
    And the browser grants camera access (mocked)
    Then I briefly see "Loading pose model…"
    And then I see the live video preview
    And I see the stop control

  # ─── Browser unsupported (pre-start) ────────────────────────────────────────
  Scenario: Unsupported browser shows a friendly fallback
    Given navigator.mediaDevices.getUserMedia is unavailable
    When the page mounts
    Then I see a "Browser not supported" message
    And I see a link back to "/home"
    And I do NOT see the "Enable camera" button

  # ─── Permission denied ──────────────────────────────────────────────────────
  Scenario: Denied permission shows recovery guidance and a retry control
    When I click "Enable camera"
    And the browser denies camera access (NotAllowedError)
    Then I see "Camera permission denied"
    And I see a button labelled "Try again"

  # ─── No camera hardware ─────────────────────────────────────────────────────
  Scenario: NotFoundError renders the "no camera" overlay
    When I click "Enable camera"
    And getUserMedia rejects with NotFoundError
    Then I see "No camera found"
    And I see a button labelled "Try again"

  # ─── Generic error recovery ─────────────────────────────────────────────────
  Scenario: Unknown error surfaces the message and offers retry
    When I click "Enable camera"
    And getUserMedia rejects with an unexpected error
    Then I see "Something went wrong"
    And I see the underlying error message
    And I see a button labelled "Retry"

  # ─── Stop + cleanup ─────────────────────────────────────────────────────────
  Scenario: Stopping the session releases the camera stream
    Given the camera is running (mocked stream active)
    When I click "Stop"
    Then the MediaStream tracks are stopped
    And I am returned to the idle overlay

  Scenario: Navigating away releases the camera stream
    Given the camera is running (mocked stream active)
    When I click the close icon to return to "/home"
    Then the MediaStream tracks are stopped
    And no animation frames remain scheduled

  # ─── Perf contract (for documentation; exercised by Playwright + instrumentation in Phase 14)
  Scenario: Pose detection is throttled to ~30 Hz on high-refresh displays
    Given the display refresh rate is 120 Hz
    When the camera is running for 1 second
    Then the pose detector has been invoked no more than 35 times

  # ─── Step bindings deferred ─────────────────────────────────────────────────
  # Per tests/features/README.md, the steps above bind to Playwright-driven
  # definitions in Phase 14 (E2E). Vitest coverage of the underlying logic
  # lives in tests/unit/pose/ and the React component is exercised manually
  # during phase closeout until then.
