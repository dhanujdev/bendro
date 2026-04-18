Feature: Home dashboard — daily progress + suggested routine
  As a signed-in user
  I want to land on /home and see my streak, weekly minutes, total
  sessions, and a shortcut back into stretching
  So that the app rewards consistency and pulls me back into the loop.

  Background:
    Given a user is signed in as userId "u-1"

  # ─── Authentication gate ───────────────────────────────────────────────────
  Scenario: Unauthenticated users are redirected to /signin
    Given no user is signed in
    When I open "/home"
    Then I am redirected to "/signin?callbackUrl=/home"

  # ─── Progress cards ────────────────────────────────────────────────────────
  Scenario: Current streak is rendered from the progress payload
    Given the data layer returns progress with currentStreak 5 and longestStreak 12
    When I open "/home"
    Then I see a streak card with "5"
    And I see the longest-streak hint "Longest streak: 12 days"

  Scenario: Week minutes and total sessions are rendered from the payload
    Given the data layer returns progress with thisWeekMinutes 48 and totalSessions 42
    When I open "/home"
    Then I see the week-minutes card with "48"
    And I see the total-sessions card with "42"

  Scenario: New user with no history sees zeros, not placeholders
    Given the data layer returns progress with currentStreak 0 and totalSessions 0
    When I open "/home"
    Then I see the streak card with "0"
    And I see the total-sessions card with "0"
    And I do NOT see the longest-streak hint

  # ─── Call-to-action ────────────────────────────────────────────────────────
  Scenario: Start-stretching CTA links to the demo player
    When I open "/home"
    Then the "Start Stretching" button links to "/player/demo"

  Scenario: Camera-mode tile links to the camera player
    When I open "/home"
    Then the camera tile links to "/player/camera"

  # ─── Suggested rail ────────────────────────────────────────────────────────
  Scenario: Recommended rail renders featured routines
    When I open "/home"
    Then I see the "morning-wake-up-flow" recommended item
    And I see the "desk-worker-relief" recommended item
    And I see the "bedtime-wind-down" recommended item

  # ─── Monetisation CTA (Phase 12) ──────────────────────────────────────────
  Scenario: Free user sees the Go-Premium upsell
    Given the user subscriptionStatus is "free"
    When I open "/home"
    Then the upgrade CTA is rendered with data-testid "home-upgrade-cta"
    And its href is "/account?upgrade=1&source=home"

  Scenario: Premium user does not see the Go-Premium upsell
    Given the user subscriptionStatus is "active"
    When I open "/home"
    Then no upgrade CTA with data-testid "home-upgrade-cta" is rendered
