# Product Change preparation

An authorized idea, product answer or in-scope delivery gap enters the installed ProductShape workflow. The worker proposes a product delta and asks for an explicit decision.

```mermaid
flowchart LR
    accTitle: Product Change preparation
    accDescr: An authorized idea, product answer or in-scope delivery gap enters the installed ProductShape workflow. The worker proposes a product delta and asks for an explicit decision.
    Idea[Authorized idea] --> Inspect[Inspect accepted product model]
    Gap[In-scope delivery gap] --> Checkpoint[Retain parent checkpoint]
    Checkpoint --> Inspect
    Inspect --> Known{Product meaning is clear?}
    Known -->|No| Question[Ask owner a product question]
    Question --> Answer[Owner answers]
    Answer --> Inspect
    Known -->|Yes| Propose[Prepare proposed product artifacts]
    Propose --> Validate{Provider validation passes?}
    Validate -->|No| Block[Report validation blocker]
    Validate -->|Yes| PR[Publish proposal on issue delivery PR]
    PR --> Decision[Wait for explicit product decision]
    Propose -->|Technical failure or cancellation| Failure[Retain evidence; inspect effects before retry]
```

## Interactions

The host supplies current product context and validates candidate artifacts through ProductShape before publication. A delivery gap retains its issue, parent stage and branch context; the review request identifies the actual delta, baseline and current PR head.

## Stops and decisions

Preparation does not change the accepted baseline. An answer clarifies intent; it does not approve apply. A revised proposal needs a current review binding. A question ends the current worker while retaining its checkpoint; verified resource absence has separate acceptance. Idea preparation alone grants no implementation authority.

<!-- pdac:cite id="FR-PRODUCT-CHANGE-WORKFLOW" digest="sha256:de0a685599fb546839c0136a8d87ce1e59290343c8151bfdc46a9549102e4ceb" -->

Execution failure, publication uncertainty and recovery follow the [shared maintenance boundary](maintenance.md).

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-product-change.md) · [Delivery contract](../../../src/packages/sdlc/README.md) · [Executable checks](../../../src/tests/product-change-files.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
