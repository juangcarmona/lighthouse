<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Existing candidate verification

An authenticated owner correction SHALL permit completion on the existing unchanged PR head after all independent checks pass and current authority is rechecked.
<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

#### Scenario: No source changes are needed

- **WHEN** an existing implementation correction passes all required independent checks without source changes
- **THEN** the host publishes a fresh completion receipt for the same PR and head without a Git write

#### Scenario: Publication inputs change

- **WHEN** the head, original implementation identity, issue intent, policy or owner feedback changes before publication
- **THEN** the host refuses completion

### Requirement: Incomplete evidence stays incomplete

The host SHALL reject an initial empty implementation and SHALL preserve failed checks, unavailable checks and pending decisions as incomplete outcomes.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

#### Scenario: Initial implementation returns no changes

- **WHEN** an initial implementation returns an empty candidate
- **THEN** the host reports missing implementation changes

#### Scenario: An existing candidate cannot pass

- **WHEN** checks fail or an existing correction reports an unavailable check or pending decision
- **THEN** its renewed receipt is incomplete

#### Scenario: A committed response is replayed

- **WHEN** publication retries an identical outcome after losing its response
- **THEN** no duplicate result or source commit is created
