# Review and close

After an authorized merge and successful adopted post-merge CI, review checks retained integration evidence and records the delivery retrospective.

```mermaid
flowchart LR
    accTitle: Review and close
    accDescr: After an authorized merge and successful adopted post-merge CI, review checks retained integration evidence and records the delivery retrospective.
    CI[Successful CI for merged revision] --> Admit{Matching authenticated integration evidence?}
    Admit -->|No| Block[Keep work item open with blocker]
    Admit -->|Yes| Review[Review delivered work and retained evidence]
    Review --> Record[Prepare retrospective and improvements]
    Record --> Valid{Review passes and publication is current?}
    Valid -->|No| Block
    Valid -->|Yes| Publish[Publish durable process record]
    Publish --> Close[Close issue and clear delivery labels]
    Review -->|Technical failure or cancellation| Failure[Retain evidence; inspect effects before retry]
```

## Interactions

The host supplies the commit-pinned integration report, matching artifacts, accepted candidate and merge authorization. The worker records the retrospective and proposed improvements; the trusted publisher validates the result before closing the work item.

## Stops and decisions

Missing history, failed post-merge CI or a blocked review keeps the issue open. Closure establishes the delivery outcome covered by those checks; release and deployment require their own evidence and automation.

Execution failure, publication uncertainty and recovery follow the [shared maintenance boundary](maintenance.md).

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-review.md) · [Delivery contract](../../../src/packages/sdlc/completion.md) · [Executable checks](../../../src/tests/sdlc-worker-completion.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
