# Apply Product Change

Explicit owner approval of the current Product Change authorizes a separate provider apply. ProductShape materializes the reviewed definition on the issue branch; merge remains the baseline-acceptance decision.

```mermaid
flowchart TD
    accTitle: Apply Product Change
    accDescr: Explicit owner approval of the current Product Change authorizes a separate provider apply. ProductShape materializes the reviewed definition on the issue branch; merge remains the baseline-acceptance decision.
    Approval[Explicit product approval and review key] --> Auth{Proposal and baseline still current?}
    Auth -->|No| Stop[Reject stale or revoked decision]
    Auth -->|Yes| DryRun[Credential-free ProductShape dry-run]
    DryRun --> Apply[Apply reviewed product delta]
    Apply --> Validate{Resulting definition valid?}
    Validate -->|No| Block[Stop and report outcome]
    Validate -->|Yes| Publish[Trusted publisher rechecks and updates PR]
    Publish --> Parent{Authorized parent and no hold?}
    Parent -->|Yes| Resume[Request original delivery stage]
    Parent -->|No| Wait[Retain next decision on PR]
    Publish --> Accept[Separate merge decision accepts baseline]
    Apply -->|Technical failure or cancellation| Failure[Retain evidence; inspect effects before retry]
```

## Interactions

Approval is bound to the proposal, baseline, owner and PR head. The credential-free job runs provider validation, dry-run and apply. The separately credentialed publisher rechecks the binding and publishes the model delta, receipt and affected citations. Dependent planning must use the resulting branch definition.

Before an epic child's implementation publication, an owner can supply an already approved and applied product source through the [epic adoption route](../../../src/packages/sdlc/epic-delivery.md#an-approved-product-prerequisite-before-implementation). The trusted host independently replays ProductShape apply against the current epic base and authenticates the exact source, owner decision and retained action. Planning and implementation use that source while policy remains bound to the original default revision. Planning reports resolve the applied change to its affected artifacts through ProductShape's validated completed manifest, then include those artifacts and their direct neighbours within the existing evidence bounds. A separate product-source receipt keeps older child-journal readers compatible; only the later checked child acceptance advances the epic branch. The source cannot carry runtime code or become a native child publication by declaring a marker.

## Stops and decisions

Silence, green checks, a question answer or generic PR approval cannot replace the explicit Product Change decision. Future permits an explicitly approved apply but still pauses parent delivery. Invalid or uncertain apply/publication stops continuation; product approval grants no merge, release or deployment authority.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

Execution failure, publication uncertainty and recovery follow the [shared maintenance boundary](maintenance.md).

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-apply-product-change.md) · [Delivery contract](../../../src/packages/sdlc/README.md) · [Executable checks](../../../src/tests/product-change-publication.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
