<!-- pdac-scope: cited -->
# PDaC adoption and verification

## ADDED Requirements

### Requirement: Explicit mandatory product contract

Every adopter SHALL require explicit, provider-validated PDaC v1alpha2 and report serialization independently from its provider version.

#### Scenario: Missing or legacy product configuration

- **WHEN** adoption or verification evaluates missing, legacy, conflicting or unsupported product configuration
- **THEN** the result identifies the gap and supported repair route without claiming compliant adoption
- **AND** reconciliation and upgrade plans expose the same product adoption gap

#### Scenario: Fresh supported initialization

- **WHEN** an adopter authorizes provider initialization through Lighthouse
- **THEN** the generated product configuration explicitly selects v1alpha2 through the corrected provider interface

### Requirement: Product-derived execution evidence

Applicable lifecycle and structured-behaviour meaning SHALL trace to executable tests, completed runs and explicit acceptance evidence.

#### Scenario: Lifecycle-based domain verification

- **WHEN** a change affects a modelled domain lifecycle
- **THEN** planning considers valid transitions, forbidden operations, terminal states and invariants using the relevant structured behaviours
- **AND** the evidence preserves source/model revisions and provider citations

#### Scenario: Later model change

- **WHEN** a model citation in an existing external test document becomes stale
- **THEN** verification reports the stale applicability and need for revalidation
- **AND** the original run outcome and revisions remain historical facts

<!-- pdac:cite id="FR-AUTHORITY-ADOPTION" digest="sha256:212442b745602e4fcae74987df431781a4b0b0eda7a85d932135d93bc3aa4d7c" -->

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->
