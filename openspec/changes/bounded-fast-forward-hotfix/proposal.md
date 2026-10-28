<!-- pdac-scope: cited -->

# Bounded unattended delivery

## Why

Small well-defined changes and isolated defects need executable delegation that preserves verifiable evidence and product authority. Issues #185 and #186 define the agreed admission and test-first correction rules.

## What Changes

- Add opt-in owner-dispatched fast-forward and hotfix compositions over the canonical stages.
- Enforce issue/policy freshness, bounded scope, independent read-only model review, correction limits and separately delegated merge.
- Demonstrate hotfix RED/GREEN through a trusted regression runner and retain the unchanged test snapshot.
- Reuse existing engine isolation, application checks, proposal provider, PR publication, protected evidence and post-merge completion.

## Capabilities

### New Capabilities

- `bounded-delivery`: authenticated unattended engineering decisions, regression proof and integration.

### Modified Capabilities

None. The accepted capability-spec inventory is empty; existing in-flight changes retain their scopes.

## Product alignment

Implements CHG-BOUNDED-UNATTENDED-DELIVERY-001, explicitly approved by the owner and applied through ProductShape. The existing stage-gate/human-authority rules permit bounded delegation; the applied requirements define eligibility and hotfix proof. Product-change handoffs remain owned by the separately delivered #184 workflow. Product/architecture decisions are checked-and-excluded from delegation. Release/deployment authority remains unchanged.

## Impact

The SDLC package gains a host composition, policy template, read-only verification role and an opt-in workflow. Existing engine, proposal and integration-evidence surfaces receive narrow supporting changes. The CLI and SDLC minor release metadata targets Lighthouse 0.12.0 and its selected SDLC dependency.

<!-- pdac:cite id="FR-FAST-FORWARD-DELIVERY" digest="sha256:cc98eedbd3f9938c82ea59e4f7499d90a1cf4cf52da707d740d9f24d800bec2e" -->
<!-- pdac:cite id="FR-HOTFIX-ROUTE" digest="sha256:09b863353e0b8f4fa61b6826e2eb3e754ef68ae5e092a84336306b95a3da43e3" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
