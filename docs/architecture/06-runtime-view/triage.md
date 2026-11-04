# Triage

An owner admits an open issue for assessment. Triage preserves the request, identifies missing facts and returns a provisional estimate; it does not dispatch refinement.

```mermaid
flowchart TD
    accTitle: Triage
    accDescr: An owner admits an open issue for assessment. Triage preserves the request, identifies missing facts and returns a provisional estimate; it does not dispatch refinement.
    Request[Owner triage request] --> Admit{Current issue and authority valid?}
    Admit -->|No| Stop[No worker starts]
    Admit -->|Yes| Assess[Assess intent and estimate]
    Assess --> Facts{Blocking information missing?}
    Facts -->|Yes| Question[Publish a question]
    Question --> Answer[Owner answers the pending question]
    Answer --> Admit
    Facts -->|No| Result[Publish triaged and estimate]
    Result --> Wait[Wait for owner delivery decision]
```

## Interactions

The router authenticates the request and serializes work on the issue. The worker distinguishes supplied facts from inferences; the trusted publisher rechecks the issue before publishing its assessment.

## Stops and decisions

A missing answer produces needs-info. An unrelated comment, duplicate request, closed issue or active human reservation cannot authorize another execution. A successful assessment stops at triaged.

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-triage.md) · [Delivery contract](../../../src/packages/sdlc/request-triage.md) · [Executable checks](../../../src/tests/issue-actions.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
