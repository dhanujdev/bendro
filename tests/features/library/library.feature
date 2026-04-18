Feature: Library page — browse, search, filter
  As a signed-in user
  I want to browse every routine with search, goal / intensity / duration
  filters, and my persisted profile (avoid areas + safety flag) applied
  automatically
  So that I can discover content that's safe and relevant for me without
  re-entering my preferences on every visit.

  Background:
    Given a user is signed in with goals ["flexibility"], avoidAreas [], safetyFlag false
    And the catalog contains a mix of gentle, moderate, and deep routines

  # ─── Initial render ─────────────────────────────────────────────────────────
  Scenario: Renders the full catalog when no filters are set
    When I open "/library"
    Then I see the filter bar with search input, goal chips, level chips, and duration chips
    And I see every routine from the catalog
    And I see a count "N of N routines"

  # ─── URL-state round-trip ──────────────────────────────────────────────────
  Scenario: Goal chip selection updates the URL and filters the list
    Given I am on "/library"
    When I click the "Flexibility" goal chip
    Then the URL contains "goal=flexibility"
    And every routine in the list has goal "flexibility"

  Scenario: Deselecting a goal chip removes it from the URL
    Given I am on "/library?goal=flexibility"
    When I click the "Flexibility" goal chip
    Then "goal" is not in the URL

  Scenario: Search input debounces and writes ?q= on submit
    Given I am on "/library"
    When I type "morning" in the search input and press Enter
    Then the URL contains "q=morning"
    And every routine's title, slug, or description contains "morning" (case-insensitive)

  Scenario: Clear-search button removes ?q= from the URL
    Given I am on "/library?q=morning"
    When I click the clear-search button
    Then "q" is not in the URL

  Scenario: Clear-filters button removes every filter param
    Given I am on "/library?q=morning&goal=flexibility&level=deep&durationBucket=short"
    When I click "Clear filters"
    Then the URL is exactly "/library"
    And I see every routine from the catalog

  # ─── Profile-driven filters (server-side, not user-clickable) ──────────────
  Scenario: avoidAreas from the profile drops matching goals automatically
    Given a user is signed in with goals ["flexibility"], avoidAreas ["hips"], safetyFlag false
    When I open "/library"
    Then no returned routine has goal "flexibility"

  Scenario: safetyFlag=true hides deep-intensity routines and shows a notice
    Given a user is signed in with goals [], avoidAreas [], safetyFlag true
    When I open "/library"
    Then no routine with level "deep" is visible
    And I see the subtitle "gentle + moderate only — safety flag on"

  # ─── Intersection + empty state ────────────────────────────────────────────
  Scenario: Empty state when filters match nothing
    Given I am on "/library"
    When I apply a combination of filters that matches no routines
    Then I see the empty state "No routines match your filters."

  Scenario: Multiple chip filters intersect
    Given I am on "/library"
    When I click "Flexibility" goal chip
    And I click "≤5 min" duration chip
    Then every routine has goal "flexibility" and totalDurationSec ≤ 300
