<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:5ad51bbe6a7b8ed785cac7bc5ed1ab8d105c1541d873d3afcc65f82712cadab1" -->

# Scoped authority context

## ADDED Requirements

### Requirement: Select bounded issue detail while retaining every artifact

The host SHALL select detailed reports for exact accepted artifact IDs referenced by the authenticated issue and owner context and their direct graph neighbours. It SHALL retain an inventory entry, report file and current provider citation for every accepted artifact. It SHALL expose unmatched references and unavailable detail without presenting them as absent product intent.

#### Scenario: Large valid model contains a high-reach term

- **WHEN** the real pinned provider validates a model with more than 1,889 artifacts and the issue references a term whose full report exceeds the report budget
- **THEN** planning receives the complete baseline-bound inventory within every existing byte limit
- **AND** the oversized detail is explicitly unavailable while source-model discovery remains available

### Requirement: Preserve resource and authority boundaries

The host SHALL preserve model, report, aggregate, index and installation bounds, safe inventory validation and baseline rechecks. Product approval and explicit provider apply SHALL remain separate from read-only evidence preparation.

#### Scenario: Selected reports exhaust the aggregate budget

- **WHEN** further provider detail cannot fit within the aggregate budget
- **THEN** the host retains the remaining artifact citations and inventory
- **AND** the affected detail is explicitly unavailable rather than silently omitted or treated as a product decision

#### Scenario: Baseline or report inventory changes

- **WHEN** the baseline differs from its admitted digest or installation observes an incomplete, duplicate or unsafe inventory
- **THEN** the host rejects the evidence
