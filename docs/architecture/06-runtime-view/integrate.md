# Integrate

Integration assesses an implementation candidate against its current approvals, required checks and retained evidence. Only a separately authorized merge path can merge that candidate.

```mermaid
flowchart LR
    accTitle: Integrate
    accDescr: Integration assesses an implementation candidate against its current approvals, required checks and retained evidence. Only a separately authorized merge path can merge that candidate.
    Request[Owner integrate label or completion event] --> Candidate{One current complete candidate?}
    Candidate -->|No| Block[Report missing prerequisite]
    Candidate -->|Yes| Validate[Verify current head and owner approval]
    Validate --> Checks{Required checks and evidence pass?}
    Checks -->|No| Block
    Checks -->|Yes| Assessment[Publish integration assessment]
    Assessment --> Authority{Explicit merge authority for this head?}
    Authority -->|No| Prepared[Retain prepared without merge]
    Authority -->|Yes| Fresh[Recheck current source and authority]
    Fresh --> Merge[Merge accepted candidate]
    Merge --> CI[Await post-merge CI]
```

## Interactions

The host binds the assessment to the issue intent, PR head, base, policy, checks and owner decision. It retains process evidence before reporting success. The merge operation includes the expected head; current GitHub rules still apply.

## Stops and decisions

The integrate label requests assessment and grants no merge permission. Prepared does not mean merged. A changed head requires a new approval. Missing provider evidence or failed checks blocks integration even when the worker run itself is green.

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-integrate.md) · [Delivery contract](../../../src/packages/sdlc/completion.md) · [Executable checks](../../../src/tests/integration-request.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
