# Integrate

Integration assesses an implementation candidate against its current approvals, required checks and retained evidence. Only a separately authorized merge path can merge that candidate.

```mermaid
flowchart TD
    accTitle: Integrate
    accDescr: The host assesses the current candidate, rechecks separate merge authority, retains a confirmed merge receipt and only then publishes the merged report. Unknown effects require reconciliation.
    Request[Owner assessment or authorized completion] --> Gate{Current candidate, checks and authority valid?}
    Gate -->|No| Block[Report missing prerequisite]
    Gate -->|Yes| Assess[Assess candidate without merge effects]
    Assess --> Passed{Assessment passed?}
    Passed -->|No| Block
    Passed -->|Yes| Authority{Explicit merge grant for exact head?}
    Authority -->|No| Prepared[Publish prepared report without merge]
    Authority -->|Yes| Fresh[Preflight publication and recheck binding]
    Fresh --> Merge[Merge exact accepted head]
    Merge -->|Confirmed| Receipt[Retain original merge receipt]
    Receipt --> Publish[Publish report and issue/PR handoffs]
    Publish --> CI[Existing post-merge CI and authorized review]
    Assess -->|Technical failure or cancellation| Failure[Retain evidence and inspect]
    Merge -->|Unknown result| Failure
    Publish -->|Interrupted after confirmed merge| Recovery[Reconcile missing publication; never repeat merge]
```

## Interactions

The host binds the assessment to the issue intent, PR head, base, policy, checks and owner decision. The host preflights the evidence target before merge, saves the actual merge receipt, then publishes the report and handoffs. If publication fails afterward, the confirmed merge remains an existing effect to reconcile. The merge operation includes the expected head; current GitHub rules still apply.

## Stops and decisions

The integrate label requests assessment and grants no merge permission. Prepared does not mean merged. A changed head requires a new approval. Missing provider evidence or failed checks blocks integration even when the worker run itself is green.

A cancellation or uncertain merge response cannot authorize another merge. [Maintenance](maintenance.md) can complete authenticated missing publication and review continuation; a blocked review remains blocked.

<!-- pdac:cite id="FR-AUTHORIZED-WORKFLOW-ENTRY" digest="sha256:b859ab077d989e855c187e1823492a04c2924fb27f7d4f59cf18822cc912ee09" -->

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-integrate.md) · [Delivery contract](../../../src/packages/sdlc/completion.md) · [Executable checks](../../../src/tests/integration-request.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
