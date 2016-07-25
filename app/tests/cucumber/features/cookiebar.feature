Business Need:
  Part-up serves cookies to analyse traffic to this site.
  Information about your use of our site is shared with Part-up for that purpose.

  Feature: Cookiebar
  As a user
  I want to have the possibility to acknowledge the cookie policy
  So that I can continue to use the site without any doubt about the part-up website usage data

  Scenario: I can acknowledge the cookie policy
    Given The cookie "cb-enabled" is not set
    When  I navigate to a partup page
    And I click on I understand button on the cookiebar
    And I refresh the webpage
    Then I should not see a cookiebar any more

  Scenario: A user can't acknowledge the cookie policy because he/she already did it
    Given The cookie "cb-enabled" is already set
    When I navigate to a partup page "/discover"
    Then I should not see the cookiebar

