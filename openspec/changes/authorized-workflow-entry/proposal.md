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

## Product definition

The maintainer approved CHG-AUTHORIZED-WORKFLOW-ENTRY-001 and its first direct-refinement implementation on 2026-10-24. The provider applied [the Product Change](../../../docs/product/changes/completed/chg-authorized-workflow-entry-001/change.md); the baseline now permits direct engineering entry. Runtime delivery remains incremental.

<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
<!-- pdac:cite id="BR-ROUTE-CONTRACT" digest="sha256:477e145dfa2a1e4aecc6fcaab72909269a3f41b23486d0ebe59ec90c908d10a9" -->
<!-- pdac:cite id="BR-TRIAGE-CONTRACT" digest="sha256:b2befe3f12cbe952b5704bc9640c231af11bd7389870c5c1476de8508d902074" -->
<!-- pdac:cite id="BR-STAGE-GATES" digest="sha256:bc61b8429b31d6b4bb9888317d4f665c36681eeca8ce656f027645373339cb3e" -->
<!-- pdac:cite id="UC-RUN-SDLC" digest="sha256:7e14cf16e302995183008043d95caf100bce023e9c8a3edf0e098ae87d740c02" -->
<!-- pdac:cite id="UC-IMPLEMENT-CHANGE" digest="sha256:35e3f3a049565dcde4627c7c6d15a88180c2aeeca702f3f510bdc913671aa5b8" -->
<!-- pdac:cite id="BR-LABEL-STATE" digest="sha256:47f8d74072f4a65a0646992fd7c6613a51689d24bc08fbe05de4151a19bce455" -->

The authority-boundary and human-authority rules remain applicable. Initialization, profiles, visual tokens and package distribution were checked as neighboring concerns and are unchanged by this delivery design.
