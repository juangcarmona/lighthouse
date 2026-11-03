# Worker evidence export

<!-- pdac-scope: cited -->

## ADDED Requirements

### Requirement: Collect bounded evidence after workload exit

The host SHALL retain bounded candidate evidence and block successful completion when required collection fails.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:9207c491167fcdb5cebf14dc750bb0ac5441f847c4607cd94111385128b692f0" -->

#### Scenario: Private worker output

- **WHEN** a completed worker uses a different UID and writes private final evidence
- **THEN** scoped ownership recovery enables host collection before independent verification

#### Scenario: Unsafe or incomplete collection

- **WHEN** a required member is unreadable, oversized or linked, or a copy fails
- **THEN** the collection fails without a published partial directory, the candidate remains bounded and recoverable, and no successful completion is emitted

### Requirement: Check runtime prerequisites before model execution

The host SHALL identify unavailable declared image capabilities before workload execution and preserve the run boundary and failure evidence.

<!-- pdac:cite id="BR-BOUNDED-WORKFLOW" digest="sha256:d67762bd448033970425c077d560dd2749e26200676953cd64aa1c09b31d803d" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->

#### Scenario: Missing image executable

- **WHEN** a required executable is absent from a legacy image
- **THEN** preflight reports the executable and image repair action without starting the agent or provisioning test services
