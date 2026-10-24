<!-- pdac-scope: cited -->

# Authorized workflow entry

## Why

The current host requires an approved triage predecessor for every refinement. Engineers cannot enter directly, and unattended descriptors still contain every supervised human stop. Work item: [#70](https://github.com/juangcarmona/lighthouse/issues/70).

## What Changes

- Separate verified capabilities, entry point, autonomy and integration authority.
- Define one reusable event router consumed by GitHub and external hosts.
- Preserve requester triage while supporting direct engineering entry and scoped clarification.
- Compose real OpenSpec proposal, implementation and verification under bounded authorization.
- Version the host contract and migrate adapters together; existing schema-1 consumers keep their behavior until upgraded.

## Capabilities

### New Capabilities

- `workflow-authorization`: authenticated entry and bounded continuation across delivery workflows.

### Modified Capabilities

None in the current OpenSpec spec collection. The ProductShape delta below owns the changed semantics.

## Impact

SDLC routes, host-contract request/context validators, workflow projection, refinement instructions, consumer resolution tests and host adapters. No new runtime package or engine provider is required. Existing evidence and fenced publication remain mandatory.

## Product definition drift

CHG-AUTHORIZED-WORKFLOW-ENTRY-001 is overlay-validated and proposed, not applied. This delivery proposal records the conflict and planned work; it does not authorize implementation against a contradictory baseline. Its complete proposed artifacts and affected IDs are listed in [the Product Change](../../../docs/product/changes/active/chg-authorized-workflow-entry-001/change.md).

<!-- pdac-drift ids="BR-ROUTE-CONTRACT,BR-TRIAGE-CONTRACT,BR-STAGE-GATES,UC-RUN-SDLC,UC-IMPLEMENT-CHANGE" summary="Direct engineering entry and event-driven continuation require CHG-AUTHORIZED-WORKFLOW-ENTRY-001; current mandatory triage and stop semantics remain in the baseline." -->

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:1c5c5c58a38c5ea4fd3174a572c8217de016e0d61fe77bdb5c850daef0f39310" -->
<!-- pdac:cite id="BR-TRIAGE-CONTRACT" digest="sha256:b6951516977c1565f0dfc4b5e59f5733b713b81d226e3a9be0ca7a5085095643" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:77d36aca6198cc7f0ed8480160252ad86912dfe685141a311a3d051fa81eb4d9" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:b8ded2e5f557bc79f1841d7b728fc0af199d3e3294f55ff2b9d3a46143364b94" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:ab285933519ea51cdea6ab7100d3cff1f7f10f242da35a0a5143f2f39f2117e2" -->
<!-- pdac:cite id="BR-LABEL-STATE" digest="sha256:69cced47a98a50efd2e01ce45f1b8115091c7a4f295c02e98805044197051cc5" -->

The authority-boundary and human-authority rules remain applicable. Initialization, profiles, visual tokens and package distribution were checked as neighboring concerns and are unchanged by this delivery design.
