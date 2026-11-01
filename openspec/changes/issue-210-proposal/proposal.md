# Proposal

<!-- pdac-scope: cited -->

## Why

Three fixed profiles cannot express all model and reasoning combinations needed by installed workers. Issue #210 requests independently configurable settings while retaining operator-controlled execution, honest evidence and existing installations.

## What Changes

- Propose schema version 2 with complete direct worker model/effort settings and optional named presets; retain version 1 unchanged.
- Propose an optional manual-router execution selector, admitted only for an authenticated owner and explicitly enabled by the operator.
- Resolve precedence deterministically, check the exact combination against operator capabilities and preserve execution limits without fallback.
- Preserve requested selection separately from resolved configuration, provenance and explicitly unverified provider values.
- Keep authentication, billing, processing tier, delegation limits and lifecycle approvals unchanged.

## Capabilities

### New Capabilities

- `worker-model-selection`: independent worker settings, optional presets, authenticated execution selection, compatibility and evidence.

### Modified Capabilities

None. `openspec list --specs` returned no current specs; the existing issue-148 change is not an archived capability.

## Impact

Expected implementation surfaces are the SDLC resolver, router source and installed projection, authenticated dispatch validation, preparation snapshots, completion preparation, OpenCode adapter, package documentation and regression tests. No new provider, transport, credential route or dependency is proposed. The inspected package is `@juangcarmona/lighthouse-sdlc` 0.16.0 on local branch `fix/210-validation`; the host supplies source revision `36ffcc2ec2c53f66ff9b35e113dbf698cf9e6410`. Local source does not establish deployed workflow behavior.

### Product authority

The owner authorized completion of the open pull requests, including the product decision for issue #210. `CHG-INDEPENDENT-MODEL-SELECTION-001` extends `FR-MODEL-PROFILES` and is applied on this branch. The product baseline changes only when this candidate is merged. Live provider acceptance remains separate.

Impacted authorities are `FR-MODEL-PROFILES` (extended behavior), `FR-PROFILE-DELEGATION` (compatibility), `UC-CONFIGURE-AGENT-CONTROL-PLANE`, `UC-RUN-AGENT`, `BR-AGENT-LAUNCH`, `BR-FAIL-CLOSED`, `BR-HUMAN-AUTHORITY` and `BR-AUTHORITY-BOUNDARIES` (preserved constraints). Provider-generated inspect, cite and impact output is retained in the evidence artifact. Related label, memory, workflow-state, initialization, upgrade and CodeGraph neighbors are outside this change: selection must not alter them. Architecture context is ADR-0007's host execution/publication boundary and the package building-block view; no persistent service is proposed.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:a16a1b44c11440550e6e17c4ad55656aaedcdd5dc73384df37d1148bbafddf36" -->
<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="UC-CONFIGURE-AGENT-CONTROL-PLANE" digest="sha256:552d5971429dfc41af56702e249b9a75cb6f10519090d14e7ee8849aab2bb571" -->
<!-- pdac:cite id="UC-RUN-AGENT" digest="sha256:a36f45b77cc1a28f6222e3becc70832fc60e70f6857d36d0870154165d28c42e" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->
<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->
