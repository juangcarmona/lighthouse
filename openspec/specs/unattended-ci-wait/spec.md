# unattended-ci-wait Specification

<!-- pdac-scope: cited -->

## Purpose

Keep candidate CI waiting inside the original authorized delivery window while preserving source, check and merge authority.

## Requirements

### Requirement: Respect the original admitted deadline while waiting for CI

The unattended adapter SHALL wait for required CI and mergeability only within the original admitted route deadline. It SHALL preserve check provenance, PR head/state, owner holds and fresh merge authorization.

#### Scenario: CI completes after ten minutes within the authorized window

- **GIVEN** required CI becomes eligible after ten minutes and before the original deadline
- **WHEN** the adapter observes the unchanged authorized candidate
- **THEN** it may promote and return its checked mergeable observation

#### Scenario: Deadline expires during source observation

- **GIVEN** CI is pending or the deadline expires during a source read
- **WHEN** the original deadline is reached
- **THEN** the adapter stops before draft promotion or merge

#### Scenario: Cancellation or authority changes

- **GIVEN** cancellation, a changed head/state, an owner draft hold or an ineligible check origin
- **WHEN** the adapter waits for CI
- **THEN** it preserves the corresponding stop and performs no unauthorized promotion or merge

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="QR-BOUNDED-AUTOMATION" digest="sha256:bcc08b11d7ab7ebf52669319710f57c9b32ec6b1c17c89c7ae8df6452249450f" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
