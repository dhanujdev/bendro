Feature: Routine Player — ready / stretching / rest / complete flow
  As a signed-in user opening a routine
  I want the player to walk me through each stretch with a timer,
  let me pause, skip, go back, and exit via mouse OR keyboard
  So that I can practice the routine hands-free on my phone or laptop
  without fighting the UI.

  Background:
    Given I am signed in
    And a routine exists with 3 stretches of 10 seconds each
    And I navigate to "/player/{routineId}"

  # ─── Ready phase ────────────────────────────────────────────────────────────
  Scenario: Ready screen lists the stretches and offers a Start control
    Then I see the routine title
    And I see 3 stretches listed with per-stretch durations
    And I see a button with testid "player-start"
    And I see an exit control with testid "player-exit"

  Scenario: Pressing Space on the ready screen starts the first stretch
    When I press the "Space" key
    Then I see the stretching screen with testid "player-stretching"
    And the timer shows "10s"

  # ─── Stretching phase ──────────────────────────────────────────────────────
  Scenario: The timer counts down each second while unpaused
    Given the stretching screen for stretch 1 is visible
    When 3 seconds of wall time pass
    Then the timer shows "7s"
    And the progress bar width is approximately 30%

  Scenario: Space toggles pause and resume
    Given the stretching screen for stretch 1 is visible
    When I press the "Space" key
    Then the pause toggle reports data-paused="true"
    And the timer stays frozen
    When I press the "Space" key again
    Then the pause toggle reports data-paused="false"
    And the timer resumes counting

  Scenario: Right arrow skips to the next stretch without waiting
    Given the stretching screen for stretch 1 is visible
    When I press the "ArrowRight" key
    Then I see the rest screen for stretch 2

  Scenario: Left arrow goes back to the previous stretch (not on stretch 1)
    Given the stretching screen for stretch 2 is visible
    When I press the "ArrowLeft" key
    Then I see the rest screen for stretch 1

  Scenario: Left arrow is a no-op on the very first stretch
    Given the stretching screen for stretch 1 is visible
    When I press the "ArrowLeft" key
    Then I am still on the stretching screen for stretch 1
    And the previous button is disabled

  Scenario: Escape exits the player and returns to /home
    Given the stretching screen for stretch 1 is visible
    When I press the "Escape" key
    Then I am navigated to "/home"

  Scenario: Typing in an input field does NOT trigger player shortcuts
    Given the stretching screen for stretch 1 is visible
    And focus is inside a text input
    When I press the "Space" key
    Then the pause toggle reports data-paused="false"

  Scenario: Modifier key combinations (Cmd-Space, Ctrl-ArrowRight) are ignored
    Given the stretching screen for stretch 1 is visible
    When I press "Meta+Space"
    Then the pause toggle reports data-paused="false"
    When I press "Control+ArrowRight"
    Then I am still on the stretching screen for stretch 1

  # ─── Completion animation ──────────────────────────────────────────────────
  Scenario: Timer reaching zero shows a completion burst before advancing
    Given the stretching screen for stretch 1 is visible
    And prefers-reduced-motion is not set
    When the timer reaches 0s
    Then the completion burst overlay with testid "player-completion-burst" is visible
    And after 500ms I see the rest screen for stretch 2

  Scenario: Reduced-motion users skip the burst and advance immediately
    Given the stretching screen for stretch 1 is visible
    And prefers-reduced-motion is enabled
    When the timer reaches 0s
    Then the completion burst overlay is NOT rendered
    And I see the rest screen for stretch 2 within 100ms

  # ─── Rest phase ────────────────────────────────────────────────────────────
  Scenario: Rest screen shows the next stretch name and a Continue control
    Given I have just completed stretch 1
    Then I see the rest screen
    And the heading shows the name of stretch 2
    And I see a button with testid "player-continue"

  Scenario: Continue advances into the next stretch
    Given the rest screen for stretch 2 is visible
    When I click the "player-continue" button
    Then I see the stretching screen with testid "player-stretching"
    And the progress indicator shows "2 / 3"

  # ─── Completion phase ──────────────────────────────────────────────────────
  Scenario: Finishing the last stretch goes to the complete screen
    Given the stretching screen for stretch 3 is visible
    When the timer reaches 0s
    Then I see the complete screen with testid "player-complete"
    And I see a link to "/home" with testid "player-complete-home"
    And I see a link to "/library" with testid "player-complete-library"

  Scenario: Keyboard shortcuts do nothing once the routine is complete
    Given the complete screen is visible
    When I press the "Space" key
    Then I stay on the complete screen
    When I press the "ArrowRight" key
    Then I stay on the complete screen

  # ─── Mobile layout (documented here, asserted in Playwright) ───────────────
  Scenario: Mobile viewport respects the safe-area insets
    Given I am on a 390x844 viewport with a top inset of 47px
    Then the ready screen top padding is at least 47px
    And the exit control has a hit area of at least 44x44 pixels

  Scenario: Keyboard hint text is hidden on sub-sm viewports
    Given I am on a 390x844 viewport
    Then the element with testid "player-shortcuts-hint" is NOT visible
    Given I am on a 1024x768 viewport
    Then the element with testid "player-shortcuts-hint" IS visible

  # ─── Step bindings deferred ────────────────────────────────────────────────
  # Per tests/features/README.md, these scenarios bind to Playwright steps in
  # Phase 14 (E2E). The pure keyboard-decision logic is covered today by
  # tests/unit/player/keyboard.test.ts — the .feature file documents the
  # user-visible contract those tests protect.
