Feature: Marketing landing page
  As a prospective user
  I want to visit "/" and learn what Bendro does
  So that I can decide whether to sign up

  Scenario: Signed-out visitor sees the landing page with hero and features
    Given no authenticated session
    When I open "/"
    Then I see the hero with "Daily stretching, made simple"
    And I see the "Start for free" CTA linking to "/onboarding"
    And I see the "Try a demo" CTA linking to "/player/demo"
    And I see the three feature cards

  Scenario: Signed-in visitor is redirected to the app
    Given an authenticated session for userId "u-1"
    When I open "/"
    Then I am redirected to "/home"

  Scenario: Header CTA label depends on session
    Given no authenticated session
    When I open "/"
    Then the marketing header CTA says "Get started"
    And its href is "/signin?callbackUrl=/home"

  Scenario: Footer links include legal + product columns
    When I open "/"
    Then the marketing footer contains a link to "/legal/terms"
    And the marketing footer contains a link to "/legal/privacy"
    And the marketing footer contains a link to "/pricing"
    And the marketing footer contains a mailto "hello@bendro.app"
    And the marketing footer contains "Not medical advice"
