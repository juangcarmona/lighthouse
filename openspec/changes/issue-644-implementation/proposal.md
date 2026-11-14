<!-- pdac-scope: cited -->
# Enforce PDaC v1alpha2 and derive verification from product behaviour

## Why

The approved Product Change for #644 requires explicit v1alpha2 for every adopter and separates model coverage, executable tests, actual runs and acceptance. Existing init and verification permit an omitted product authority, and worker reports omit lifecycle and behaviour definitions.

## What Changes

- Require a provider-validated v1alpha2 product contract in foundation verification and expose adoption gaps in init, adoption, reconciliation and upgrade plans.
- Migrate Lighthouse's own model without changing product meaning, preserving existing governance through v1alpha2 relationships and keeping active changes valid.
- Supply lifecycle/behaviour definitions and serialization metadata with worker context and share scenario/evidence guidance across delivery skills.
- Exercise fresh and legacy consumers, invalid configuration, real transition/invariant tests, failed runs and stale external evidence.

## Capabilities

### New Capabilities

- `pdac-adoption-verification`: mandatory product serialization, reviewed migration and product-derived evidence.

### Modified Capabilities

None.

## Impact

CLI initialization and authority verification, provider configuration, SDLC evidence preparation, packaged guidance, generated starters, package contents and clean-consumer CI. ProductShape retains schema/model/citation ownership. The provider initializer defect is tracked separately as productshape#325 and must be fixed in a released compatible provider before fresh adoption can pass.

<!-- pdac:cite id="FR-AUTHORITY-ADOPTION" digest="sha256:212442b745602e4fcae74987df431781a4b0b0eda7a85d932135d93bc3aa4d7c" -->

<!-- pdac:cite id="FR-CHANGE-EVIDENCE" digest="sha256:90af94bb73cab9bf61e3a4c6eb7d44f68b42513063adadaa629ba72e69150f69" -->
