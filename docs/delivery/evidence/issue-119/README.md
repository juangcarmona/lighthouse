# Issue-control completion

## Reconciled proposal

[Run 43681130581](https://github.com/juangcarmona/lighthouse/actions/runs/43681130581) failed in publication after its agent returned a passing assessment. The retained [reconciliation](proposal-reconciliation.json) binds its source, attempt, result artifact and failed job. Strict OpenSpec validation rejected an overlong requirement before proposal publication. The owner authorized completing #119 manually; the consumed attempt was not replayed.

The existing contract was delivered in [PR #563](https://github.com/juangcarmona/lighthouse/pull/563), qualified with the owner-user credential in [the source qualification](../../../process/20261108-119-issue-controls/README.md), and published in SDLC 0.22.0 by [PR #570](https://github.com/juangcarmona/lighthouse/pull/570). Those historical receipts remain distinct from current source verification and consumer acceptance.

## Compatible correction

Refine and Propose now expose prerequisite observations from their existing canonical admission checks. Missing authority, incomplete source reservation coverage and unevaluated stage evidence remain explicit. The additive fields do not alter eligibility, route semantics or execution authority. Three regressions cover direct entry, disabled policy, unavailable/denied authority, unsupported contract, reservation gaps and validated versus stale refinement.

Review traced the SDK, admission, intent binding, ledger, execution observer, public package exports and the external consumer bridge. Existing lost-response, duplicate, changed-input, typed-comment and question-resolution regressions remain applicable. The owning [completion plan](../../../../openspec/changes/issue-119-completion/tasks.md) tracks publication, consumer adoption and connected verification separately.

Ponytail guided the code review. Human explanations used the repository's Plain English and Humanizer fallback; the completion instructions were reviewed with Writing for Agents. Exact-head CI, registry artifacts and connected consumer results remain required before closure.
