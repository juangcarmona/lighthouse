# Proposal

<!-- pdac-scope: cited -->

## Why

Requesters should describe their problem and desired result without learning the engineering process. Native intake currently cannot start triage, and its size classification does not explain relative effort.

## What Changes

- Provide a public issue form requiring only the problem and desired result, with optional context.
- Let the owner admit any open issue to a bounded triage worker; opening an issue alone spends no agent budget.
- Preserve the request, separate evidence-backed inferences from unknowns and ask only outcome-blocking questions.
- Record a provisional estimate on the approved 1, 2, 3, 5, 8, 13 scale with rationale, confidence and separate uncertainty; refinement reconsiders it.
- Preserve legacy S/M/L/XL classifier inputs without claiming a conversion to points.

## Capabilities

### New Capabilities

- `request-triage`: Simple intake, owner admission, evidence-backed clarification and explained estimation.

### Modified Capabilities

None. The accepted OpenSpec capability inventory is empty.

## Impact

SDLC schemas, classifier, stage validation, GitHub routing and worker installation, packaged skills and documentation. Product intent is recorded through an applied Product Change in the same PR. No new runtime dependency. Decomposition and aggregate delivery remain #146.

## Product authority

The verified owner decisions on [issue #145](https://github.com/juangcarmona/lighthouse/issues/145) authorize this scope, its numeric scale and explicit Product Change apply. [CHG-REQUEST-TRIAGE-145](../../../docs/product/changes/completed/chg-request-triage-145/change.md) records that intent. Direct engineering entry remains an exception; this change does not make triage mandatory for that route.

<!-- pdac:cite id="BR-TRIAGE-CONTRACT" digest="sha256:35458afe1b482e22633da9638f2e1ea824c8ba1a1d2370596926b98dad4a969b" -->
<!-- pdac:cite id="FR-TRIAGE-WORK-ITEM" digest="sha256:834a4bc0e1ed08ba60eab82d1d0615267d33e4a5acf2b5294be11bcbb8b34bb5" -->
<!-- pdac:cite id="TERM-WORK-ITEM-SIZE" digest="sha256:e62709b1ae3cf3ee91d117922fabf6043ca7e5ff600a8f0810aa4945cccef2de" -->
