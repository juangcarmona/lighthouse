<!-- pdac-scope: cited -->
<!-- pdac:cite id="FR-AUTHORITY-CONTEXT" digest="sha256:5ad51bbe6a7b8ed785cac7bc5ed1ab8d105c1541d873d3afcc65f82712cadab1" -->

# Scope large-model evidence to the issue

## Why

Planning fails before agent execution when eagerly serialized ProductShape transitive reports exceed the existing report or aggregate budgets. A valid model can fit the accepted-model budget while its repeated impact reports do not.

## What Changes

- Select detailed provider reports from IDs in the authenticated issue, owner answers and parent evidence, plus direct graph neighbours.
- Keep every model artifact and current citation in the serialized inventory, with explicit unavailable detail outside the selection.
- Keep per-report, aggregate and index bounds. Preserve available inspection/definitions when impact alone exceeds the report bound, and account for unavailable reports in scope metadata.
- Carry the same evidence semantics into planning and Product Change workers without changing approval, apply or candidate-publication authority.

## Capabilities

### New Capabilities

- `scoped-product-evidence`: Bounded, baseline-bound issue detail with a complete inventory and explicit missing evidence.

### Modified Capabilities

None. The existing complete-report API remains available to callers without an issue scope.

## Impact

The shared SDLC evidence adapter and its planning/Product Change callers change. Regression coverage uses the real pinned provider with 2,002 artifacts and a high-reach term, plus controlled byte-bound cases. ProductShape owns the source model and its validation. This repairs the existing authority-context transport required by FR-AUTHORITY-CONTEXT; it does not define new product semantics.
