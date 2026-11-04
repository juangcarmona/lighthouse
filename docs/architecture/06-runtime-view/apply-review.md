# Apply review

Owner feedback on an eligible proposal or implementation PR requests a correction of that same branch. Optional CI repair enters the same worker through a separately authenticated failure event.

```mermaid
flowchart LR
    accTitle: Apply review
    accDescr: Owner feedback on an eligible proposal or implementation PR requests a correction of that same branch. Optional CI repair enters the same worker through a separately authenticated failure event.
    Feedback[Owner feedback on current PR] --> Admit{Original grant and current head valid?}
    CI[Failed adopted CI on selected PR] --> Budget{CI repair enabled and budget remains?}
    Budget -->|Yes| Admit
    Budget -->|No| Stop[Stop with required action]
    Admit -->|No| Stop
    Admit -->|Yes| Correct[Correct or revalidate same candidate]
    Correct --> Clear{Request is unambiguous?}
    Clear -->|No| Question[Ask owner on existing PR]
    Question --> Feedback
    Clear -->|Yes| Checks[Run independent checks]
    Checks --> Publish[Publish same PR and fresh evidence]
    Publish --> Review[CI and owner review current head]
    Correct -->|Technical failure or cancellation| Failure[Retain evidence; inspect effects before retry]
```

## Interactions

The router binds feedback to the current discussion and retained implementation or proposal identity. The correction retains the original stage and write scope. A verification-only correction can publish fresh evidence without source changes.

## Stops and decisions

CI repair is opt-in, limited to two attempts for the PR identity, and does not reset when the head changes. Uncertain dispatch, active human work, changed authority and exhausted attempts stop it. Product proposals retain their provider validation and renewed product-decision requirements.

Execution failure, publication uncertainty and recovery follow the [shared maintenance boundary](maintenance.md).

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-apply-review.md) · [Delivery contract](../../../src/packages/sdlc/README.md#bounded-ci-correction) · [Executable checks](../../../src/tests/proposal-review.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
