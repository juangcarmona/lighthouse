# Design

<!-- pdac-scope: cited -->

## Context

See proposal.md for motivation and the applied Product Change. This is the candidate design; completion and acceptance are tracked in tasks.md. The current resolver accepts schema version 1 and three fixed profile names. The adapter already forwards a resolved model variant and emits unverified provider settings; delegated tasks already select explicit profiles. Ordinary router requests have authenticated, digest-bound artifacts but no model selector.

<!-- pdac:cite id="FR-MODEL-PROFILES" digest="sha256:76493c2d6d9cca77ad0d549c24a4c3ccdb55d62da1a348d84c1b0c22b85ada71" -->
<!-- pdac:cite id="UC-CONFIGURE-AGENT-CONTROL-PLANE" digest="sha256:552d5971429dfc41af56702e249b9a75cb6f10519090d14e7ee8849aab2bb571" -->

## Goals / Non-Goals

**Goals:** one deterministic resolver for ordinary and delegated workers; more than three exact combinations; explicit field provenance; no silent fallback; additive runtime evidence.

**Non-Goals:** new providers, capability discovery through account access, costly-selection approval workflows, pricing catalogs, billing changes, automatic model optimization, new tools or lifecycle authority. Unusually costly combinations are controlled by operator capabilities and opt-in, not an invented approval gate.

## Decisions

1. **Version the extension.** Schema version 1 retains its fixed names, partial operator profile overrides, delegated API and receipt fields. Version 2 permits safe lowercase preset names and worker/default selectors that are either a preset name or a complete `{ model, reasoningEffort }` object. Retain the existing `profiles`, `workers` and `defaultProfile` keys so migration is local. Reject mixed selector forms, unknown keys, unsupported versions and partial direct settings. Model identifiers remain OpenAI-only, without embedded reasoning variants. A separate presets-only API was rejected because it still forces adopters to name every combination.
2. **Whole-selector precedence, independent policy.** Choose authenticated execution selection, operator worker setting, project worker setting, operator default, then project default, in that order. For a named preset, merge project definition with operator definition field by field, operator last, preserving version 1 behavior. Direct settings must be complete and are never silently completed from a lower-precedence selector. Every result, including owner selections, must pass operator model/effort/tool capabilities; existing resource limits remain authoritative. Operator worker assignments are defaults below an explicitly allowed owner selection, not a capability grant. Do not infer a missing assignment or effort.
3. **Explicit execution opt-in.** Add one optional manual-router `model_selection` JSON string containing either `{ profile }` or `{ model, reasoningEffort }`. Only owner-originated `workflow_dispatch` may supply it. Reject selection on automated continuation/replay, labels, comments, issue text or review feedback. Operator version 2 configuration requires explicit `allowExecutionSelection: true`; absent or false rejects it. This avoids adding comment-command parsing and prevents owner text used as task context from becoming executable configuration.
4. **Bind selection to authenticated dispatch.** Parse strictly during request preparation, include normalized selection in the existing digest-bound artifact, and rederive/compare it against the authenticated event during admission. Copy only admitted selection into stage snapshots, including completion snapshots. Do not accept a worker input or arbitrary environment variable as owner authorization. Preserve the existing trusted-host delegated-profile route separately, reject conflicting selectors and never propagate an execution choice automatically to a later lifecycle stage.
5. **Add evidence without rewriting history.** Retain `runtime.model` and the existing `modelExecution` fields. Add the raw normalized requested selector, resolved model/effort, selector source and field sources. Existing receipts remain readable and unchanged on disk. Keep provider model/effort null with explicit unverified status unless an authenticated provider receipt is actually available. Keep event-exposed measured usage separate from actual charges and API-equivalent estimates; absence remains null, not zero. Configuration is never provider confirmation.
6. **Preserve boundaries.** Construct only the existing `provider/model#effort` adapter argument. No setting may select credentials, authentication volume, billing route, service tier, tools, token/time/process limits or approval state. Inventory denial stops before launch; actual provider errors fail the run after one selected launch without retrying another combination. Routing and repository checks remain deterministic host work.

<!-- pdac:cite id="FR-PROFILE-DELEGATION" digest="sha256:dfe2874654b6e78de96b24d146fb944d966c6773a69d5a1d93a3f5eaadc8eb1b" -->
<!-- pdac:cite id="UC-RUN-AGENT" digest="sha256:a36f45b77cc1a28f6222e3becc70832fc60e70f6857d36d0870154165d28c42e" -->
<!-- pdac:cite id="BR-AGENT-LAUNCH" digest="sha256:10c5293cdbafffda987b287968e141daceed8a063da166faa339793ebe10c1ed" -->
<!-- pdac:cite id="BR-FAIL-CLOSED" digest="sha256:1a8bdc2e330fb683bd1354d898b1072d4a5fe30aeab26d3c02b2036352a7fc8d" -->
<!-- pdac:cite id="BR-HUMAN-AUTHORITY" digest="sha256:c26daacd93dfc059f9ff99cdac179a2ee0d136d5c02cd146b92b3c46e49752e8" -->

## Risks / Trade-offs

- [Product authority changes] → recheck the applied Product Change and current owner instructions before extending its scope.
- [Operator capability inventory can be stale] → label it configuration-only, propagate real provider errors and never fall back.
- [Execution selection could leak into continuation] → reject it on automated/replay inputs and test fresh selection defaults in the next stage.
- [Schema extension could alter existing installations] → keep version 1 tests and legacy byte-for-byte forwarding; reject new forms under version 1.
- [Model access is unavailable in a credential-free check] → use deterministic adapter fixtures for wiring and failure behavior; report live provider acceptance as unverified, never fabricate it.

<!-- pdac:cite id="BR-AUTHORITY-BOUNDARIES" digest="sha256:76a491da103c53651b27e2723ee04b4cf5949e566f6102ed1714e0dbff29f40d" -->

## Migration Plan

After product approval and implementation, install the updated package and explicitly review router projection updates. Existing version 1 settings need no migration. To adopt direct settings/custom names, change only the relevant configuration to version 2; provision capabilities first and enable execution selection only deliberately. Do not modify credentials or account routes. Keep the existing legacy `model`; disabling profile opt-in restores its exact forwarding and rejects explicit selectors. To downgrade the package, restore version 1 declarations before downgrade; do not silently reinterpret version 2 in an older resolver. Historical receipts need no rewrite.

## Product decision

The owner authorized this change and its application on the candidate branch. Provider acceptance is still unverified.
