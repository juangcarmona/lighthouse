<!-- pdac-scope: none reason="The owner explicitly requests a documentation-only dispatch fixture in issue 130, without product behavior changes." -->

# Proposal

## Why

Issue [#130](https://github.com/juangcarmona/lighthouse/issues/130) needs a minimal, reviewable output from an independently dispatched implementation run. The fixture supplies that output without changing the product.

## What Changes

- Add `docs/evidence/independent-dispatch-fixture.md` with the exact requested heading and sentence.
- Keep the proposal, design and completed task record alongside the fixture.
- Set `skip_specs: true` because this is documentation-only evidence, not a behavior change.

## Capabilities

### New Capabilities

None. The fixture does not introduce system behavior.

### Modified Capabilities

None. `openspec list --specs` reports no current specifications; no delta specifications are needed.

## Impact

Only the evidence document and this planning directory change. No workflows, configuration outside this change's OpenSpec metadata, application code, APIs or dependencies change. No product definition is altered or implemented by the fixture; the owner supplied its complete content in the issue.

The operator owns verification of routing, exact request/worker links, duplicate suppression, admission failure and untrusted receipts. Those checks are not inferred from the fixture text or from repository checks. This change does not authorize merging, closing the issue or triggering another stage.
