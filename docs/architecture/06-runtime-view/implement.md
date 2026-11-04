# Implement

An authorized implementation request or passed refinement starts planning, implementation and verification in one bounded workspace. The worker publishes its candidate as a draft PR.

```mermaid
flowchart LR
    accTitle: Implement
    accDescr: An authorized implementation request or passed refinement starts planning, implementation and verification in one bounded workspace. The worker publishes its candidate as a draft PR.
    Request[Owner request or authorized continuation] --> Admit{Current scope and checks available?}
    Admit -->|No| Stop[Report blocker]
    Admit -->|Yes| Plan[Prepare engineering plan]
    Plan --> Product{Product prerequisite missing?}
    Product -->|Yes| Handoff[Save checkpoint and request Product Change]
    Handoff --> Resume[Revalidate authorized parent after apply]
    Resume --> Plan
    Product -->|No| Code[Implement within granted paths]
    Code --> Verify{Independent checks pass?}
    Verify -->|No| Block[Return failed or blocked evidence]
    Verify -->|Yes| Publish[Publish plan and code in draft PR]
    Publish --> CI[Run adopted CI on exact candidate]
    CI --> Ready[Passing CI permits ready for review]
```

## Interactions

The agent writes a candidate in its isolated workspace. Trusted host checks validate the actual candidate, and the publisher rechecks source, intent, reservation and write scope before updating the bot-owned branch. CI readiness is reconciled from checks on that PR head.

## Stops and decisions

An in-scope product gap can use the optional Product Change path while retaining the parent checkpoint. Missing scope authority requires an owner decision. Failed CI keeps the PR unready; optional CI correction uses apply-review. Implementation itself never merges.

## Implementation evidence

[Worker source](../../../src/packages/sdlc/workflows/lighthouse-sdlc-implement.md) · [Delivery contract](../../../src/packages/sdlc/README.md) · [Executable checks](../../../src/tests/delivery-events.test.mjs)

[All workers](worker-catalogue.md) · [Runtime view](README.md)
