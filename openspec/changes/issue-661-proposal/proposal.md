# Proposal

<!-- pdac-scope: cited -->

## Why

The supported .NET example requires SDK 10.0.112 with `latestPatch` and Aspire 13.6.5, but environment provisioning and preflight still require SDK 10.0.100 and omit the Aspire bundle. Align these prerequisites without changing the example, verification commands or workload restrictions.

## What Changes

- Accept installed stable SDKs in the 10.0.1xx feature band at or above 10.0.112, including the previously qualified 10.0.115.
- Provision pinned Aspire CLI 13.6.5 and extract its embedded bundle during image construction; expose the resolved layout to unchanged AppHost builds.
- Reject missing or incompatible SDKs, incorrect CLI versions and missing bundle components before services or agent work start.
- Update fixtures, opt-in Docker qualification and operator guidance together; retain immutable image/source provenance and unchanged isolation.

## Capabilities

### New Capabilities

- `dotnet-execution-prerequisites`: compatible SDK selection and pre-provisioned Aspire prerequisites for the declared .NET execution profile.

### Modified Capabilities

None. The existing `managed-command-scratch` capability remains unchanged.

## Impact

Changes affect the SDLC preflight, operator image builder, execution-environment tests and guidance. No application, verifier, resource policy, installed image or runner configuration changes are included. Image build, configuration adoption and native qualification need separate receipts after source delivery.

## Product context

The accepted model is PDaC v1alpha2 at the host-supplied source revision `257fe10554be18dcf4565f572177d7c8775f5a91`; ProductShape 0.26.1 supplies inspection and citation reports. This is an owner-admitted tooling correction under #661, not a product-model change. Failed prerequisites remain explicit failures.
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:831781c37d7eb639a39dd1a6db84bca99996d4cbda99039524e28a41fd1cc015" -->

Inspected neighbours include UC-RUN-AGENT, FR-AGENT-LAUNCH, BR-AGENT-LAUNCH, QR-AGENT-ISOLATION and SB-SDLC-GATES. Role delegation, memory/lease isolation and stage transitions are unchanged and do not introduce SDK requirements. There is no affected domain lifecycle or structured behaviour for SDK selection; the issue and accepted .NET profile supply the concrete compatibility cases. Existing lease, service cleanup and stage tests remain regression coverage. The installed `ponytail` helper is absent; use the existing small-module architecture and record direct source review rather than claiming that helper ran.
