# Propose

The optional engineering-proposal worker prepares an OpenSpec plan after successful refinement. It publishes a separate proposal PR for review.

```mermaid
flowchart TD
    accTitle: Propose
    accDescr: The optional engineering-proposal worker prepares an OpenSpec plan after successful refinement. It publishes a separate proposal PR for review.
    Request[Owner propose request] --> Gate{Ready and current refinement evidence?}
    Gate -->|No| Block[Report missing prerequisite]
    Gate -->|Yes| Plan[Prepare OpenSpec proposal]
    Plan --> Validate{Proposal validates?}
    Validate -->|No| Stop[Publish blocker or question]
    Validate -->|Yes| PR[Publish proposal PR]
    PR --> Review[Owner reviews current proposal]
    Review -->|Changes requested| Correct[Apply review on same PR]
    Review -->|Approved| Wait[Record design decision]
```

## Interactions

The worker writes proposal artifacts within its granted scope. The publisher retains the proposal and evidence on a bot-owned PR. Feedback returns to apply-review on that branch.

## Stops and decisions

Proposal approval records a design decision. It starts neither implementation nor merge. For a design-only request, future also prevents implementation continuation. Implementation can instead prepare its plan and code together without this separate proposal PR.

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-propose.md) · [Delivery contract](../../../src/packages/sdlc/README.md) · [Executable checks](../../../src/tests/issue-actions.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
