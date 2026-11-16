<!-- pdac-scope: cited -->

# Issue-control completion delta

## ADDED Requirements

### Requirement: Structured prerequisite observations

Each Refine and Propose assessment SHALL expose the observed availability of its installed contract, write authority, repository policy, source reservations and stage evidence. Evidence skipped after an earlier unmet prerequisite SHALL remain explicitly unavailable. Reporting SHALL preserve existing eligibility decisions and remain read-only.

#### Scenario: Direct owner entry

- **WHEN** an authenticated owner can request refinement without triage
- **THEN** stage evidence identifies direct owner entry rather than claiming a passed triage result

#### Scenario: An earlier prerequisite prevents evidence inspection

- **WHEN** source authority, policy or reservation coverage prevents admission checks
- **THEN** stage evidence remains unavailable with an explicit reason and no write occurs

#### Scenario: Proposal prerequisites fail

- **WHEN** the canonical proposal admission check rejects missing or stale refinement evidence
- **THEN** its existing reason and availability are exposed as the stage evidence observation

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
