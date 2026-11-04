# Bounded unattended compositions

An owner dispatches `ff` or `hotfix` through the separately installed workflow. The host composes existing stages under project-owned policy; it authenticates the issue, scope, models, checks and budgets before running an agent. Initial execution and merge delegation are disabled independently.

```mermaid
flowchart TD
    accTitle: Unattended delivery under separate authority
    accDescr: Owner-authorized fast-forward or hotfix uses scoped implementation and independent review. Human decisions, failed evidence and exhausted budgets stop advancement; merge remains separately delegated.
    Request[Owner dispatch from default branch] --> Gate{Enabled policy and current authority?}
    Gate -->|No| Stop[Retain blocker; no delivery]
    Gate -->|Yes| Route{Selected composition}
    Route -->|ff| Refine[Refine bounded low-risk scope and plan]
    Route -->|hotfix| Plan[Confirm defect and compact regression plan]
    Refine --> Ready[Independent readiness and plan review]
    Plan --> Ready
    Ready --> Test{Hotfix regression required?}
    Test -->|Yes| Red[Trusted regression RED on unchanged production]
    Red --> Implement
    Test -->|No| Implement[Implement within scope and correction budget]
    Implement --> Checks[Host checks and independent candidate review]
    Checks --> Valid{Evidence and required checks pass?}
    Valid -->|No| Stop
    Valid -->|Yes| PR[Publish reviewed candidate PR]
    PR --> Authority{Current delegated merge authority?}
    Authority -->|No| Wait[Retain PR for owner decision]
    Authority -->|Yes| Merge[Recheck exact head and integrate]
    Merge --> Post[Existing post-merge verification and review]
    Implement -->|Technical failure or exhausted corrections| Stop
    Merge -->|Uncertain effect| Stop
```

<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->

<!-- pdac:cite id="FR-HOTFIX-ROUTE" digest="sha256:09b863353e0b8f4fa61b6826e2eb3e754ef68ae5e092a84336306b95a3da43e3" -->

## Boundaries and outcomes

Fast-forward requires a low-risk estimate, reversible scope and resolved dependencies. Hotfix requires a trusted assertion failure against unchanged production code and preserves the exact test bytes through GREEN and independent review. Setup failures cannot serve as RED. Distinct configured implementation/reviewer models must resolve to distinct model identifiers; that configuration does not prove provider identity or independence of reasoning.

The host enforces candidate paths, measured scope, required checks and at most two configured correction rounds. Questions, revoked authority, reservations and unavailable evidence stop advancement. Existing receipts make a rerun stop for inspection rather than repeat uncertain effects. A published candidate, delegated merge, post-merge acceptance, release and deployment remain separate outcomes.

[Workflow](../../../src/packages/sdlc/workflows/lighthouse-sdlc-unattended.yml) · [Host adapter](../../../src/packages/sdlc/src/unattended-actions.mjs) · [Policy and limits](../../../src/packages/sdlc/unattended.md) · [Acceptance boundaries](worker-catalogue.md#acceptance-evidence-and-limits)

[Catalogue](worker-catalogue.md) · [Runtime view](README.md)
