<!-- pdac-scope: cited -->

# Delivery request reconciliation

## ADDED Requirements

### Requirement: Equivalent grants reuse authenticated work

The native dispatcher SHALL reconcile an equivalent effective work-item request with its existing authenticated receipt or implementation candidate before starting another worker. It SHALL preserve current authority and distinguish stale, changed, blocked and uncertain observations.

#### Scenario: A second event refers to the current implementation

- **WHEN** equivalent owner/resume events are processed under the existing issue lease
- **THEN** at most one implementation worker and candidate are admitted and the later event links the existing outcome

#### Scenario: A dispatch acknowledgement is lost

- **WHEN** a dispatch was recorded but its execution is not confirmed
- **THEN** the dispatcher SHALL retain uncertainty and SHALL NOT blindly resend

### Requirement: Completion subscriptions preserve authorized continuation

The installed router SHALL subscribe to adopted continuation workflows and verify their actual completed identity and work-item subject before requesting delivery. Bot wake-ups and scheduled reconciliation SHALL remain available under the existing authorization.

#### Scenario: A relevant bot continuation is delivered twice

- **WHEN** a current authenticated stage result wakes the router through equivalent completion signals
- **THEN** continuation SHALL resolve to one request without expanding its original effects

#### Scenario: An unrelated workflow completes

- **WHEN** an unadopted workflow or unrelated candidate completes
- **THEN** no delivery worker SHALL be requested for that observation

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->
