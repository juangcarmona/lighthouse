<!-- pdac-scope: cited -->

# Integration label admission

## Why

Issue #317 records an owner integration request whose Actions jobs all skipped. The repository advertises an assessment label that the package catalogue and native router do not admit.

## What Changes

Add the existing integration assessment to the native command catalogue, route supported label requests through authenticated admission, and publish exact missing prerequisites. Bind one eligible implementation PR, its current head, complete receipt and current owner approval. A label assessment always has merge disabled. Recheck the binding in the dispatcher, worker and trusted publisher.
<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->
<!-- pdac:cite id="BR-ENTRY-AUTHORITY" digest="sha256:f57d0272ff0c5f7ce8bfc534d6d9adba6c294d9c00b8bc109d8243ccc90b2b33" -->

Ship labels capability version 4 through the existing create-and-preserve reconciliation operation. Preserve customized labels and descriptions; include execution-failed adoption evidence so real worker failures can project their state.
<!-- pdac:cite id="BR-LABEL-ROLES" digest="sha256:1c708a16c7730f0fe94cef9efa5f729e3d64a6b4943dcc06adf6759ce062725c" -->
<!-- pdac:cite id="FR-WORKFLOW-HANDOFFS" digest="sha256:89c81c96c437f8417aac7fed37f5690a44314051f75fe9a54166b90709df6f0a" -->

## Capabilities

### New Capabilities

- `integration-label-admission`: make the advertised existing assessment work through native label admission.

### Modified Capabilities

None.

## Impact

Package catalogue, router, completion authentication, installer projections, delivery instructions and executable admission matrix. Scheduling and broader deduplication remain in #321; CI repair remains in #311.

## Product definition

The model is unchanged from the preceding reviewed baseline. This repairs the existing integration entrypoint while preserving separate engineer entry and merge authority. Structural impact of FR-AUTHORIZED-WORKFLOW-ENTRY was checked against BR-ROUTE-CONTRACT and BR-STAGE-GATES; their route composition and protected decisions do not change. BR-LABEL-ROLES and FR-WORKFLOW-HANDOFFS retain their existing roles, failure-state adoption and visible outcome rules. No new product decision or canonical model edit is needed.
