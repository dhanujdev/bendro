Feature: Legal pages
  As a user who cares about terms + data handling
  I want to read the Terms of Service and Privacy Policy
  So that I know what I'm agreeing to and how my data is handled

  Scenario: Terms of Service renders with a last-updated date
    When I open "/legal/terms"
    Then I see the heading "Terms of Service"
    And I see a "Last updated:" date
    And I see the section "What Bendro is"
    And I see a link to "/legal/privacy"

  Scenario: Privacy Policy calls out on-device pose processing
    When I open "/legal/privacy"
    Then I see the heading "Privacy Policy"
    And I see the section "Camera and pose data stay on your device"
    And I see a link to "/legal/terms"
    And I see the contact email "privacy@bendro.app"

  Scenario: Both legal pages are reachable from the marketing footer
    When I open "/pricing"
    Then the marketing footer links to "/legal/terms"
    And the marketing footer links to "/legal/privacy"
