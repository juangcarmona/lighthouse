---
pdac-scope: cited
---

# Runner telemetry proposal

## Why

Issue #521 needs producer telemetry that any adopter can consume from its first runner installation. CHG-LH-RUNNER-TELEMETRY-001 was explicitly approved in this chat and applied through ProductShape on the issue branch; canonical acceptance awaits merge.

<!-- pdac:cite id="FR-RUNNER-TELEMETRY" digest="sha256:bd00878a103d0df0929644c53cace71def31b42de73d92dffed61ba22159a068" -->

## What Changes

Add bounded local event journals, a versioned consumption schema, native OpenCode metadata capture, resource sampling, runner hooks, workflow observations and optional OTLP export. Preserve existing policy, credentials and mandatory evidence behavior. The applied new term, use case and requirement define this outcome; the control-plane, package-boundary, memory, model-profile and lifecycle neighbours keep their existing responsibilities.

## Capabilities

### New Capabilities

- `runner-telemetry`: collect correlated observations and expose them to independent consumers.

### Modified Capabilities

None.

## Impact

The SDLC package, runner example, workflow projections and execution adapter gain producer instrumentation. Consumers retain their application and deployment choices. No dashboard, merge, release or shared-runner rollout is included in implementation acceptance.
