# Issue-control completion

## Reconciled proposal

[Run 43681130581](https://github.com/juangcarmona/lighthouse/actions/runs/43681130581) failed in publication after its agent returned a passing assessment. The retained [reconciliation](proposal-reconciliation.json) binds its source, attempt, result artifact and failed job. Strict OpenSpec validation rejected an overlong requirement before proposal publication. The owner authorized completing #119 manually; the consumed attempt was not replayed.

The existing contract was delivered in [PR #563](https://github.com/juangcarmona/lighthouse/pull/563), qualified with the owner-user credential in [the source qualification](../../../process/20261108-119-issue-controls/README.md), and published in SDLC 0.22.0 by [PR #570](https://github.com/juangcarmona/lighthouse/pull/570). Those historical receipts remain distinct from current source verification and consumer acceptance.

## Compatible correction

Refine and Propose now expose prerequisite observations from their existing canonical admission checks. Missing authority, incomplete source reservation coverage and unevaluated stage evidence remain explicit. The additive fields do not alter eligibility, route semantics or execution authority. Three regressions cover direct entry, disabled policy, unavailable/denied authority, unsupported contract, reservation gaps and validated versus stale refinement.

Review traced the SDK, admission, intent binding, ledger, execution observer, public package exports and the external consumer bridge. Existing lost-response, duplicate, changed-input, typed-comment and question-resolution regressions remain applicable. The owning [completion plan](../../../../openspec/changes/issue-119-completion/tasks.md) tracks publication, consumer adoption and connected verification separately.

Ponytail guided the code review. Human explanations used the repository's Plain English and Humanizer fallback; the completion instructions were reviewed with Writing for Agents. Connected consumer dispatch and continuation results remain required before closure; source publication and registry installation are recorded below.

## Source release and public installation

| Receipt | Result |
| --- | --- |
| SDK correction | [PR #724](https://github.com/juangcarmona/lighthouse/pull/724), merged `96eaab832b99f05dc4f85973f49586399d5a69cc` |
| Exact source verification | [43964357740](https://github.com/juangcarmona/lighthouse/actions/runs/43964357740): 1,387 tests, 1,372 passed and 15 optional skips; 19 separate practice regressions passed |
| Package and clean consumer | [43964357706](https://github.com/juangcarmona/lighthouse/actions/runs/43964357706) passed |
| Versioning | [PR #725](https://github.com/juangcarmona/lighthouse/pull/725), release `0283ff1a5f01650dda4a44e9c7d1732c3af52c0a`; repository, package, clean-consumer, native .NET, visual and public-site checks passed |
| Protected publication | [43966091297](https://github.com/juangcarmona/lighthouse/actions/runs/43966091297), owner-authorized deployment 7837625446 |
| Postmerge source verification | [43966091221](https://github.com/juangcarmona/lighthouse/actions/runs/43966091221) passed at the release commit |
| Public artifacts | CLI 0.13.18 and SDLC 0.25.1 downloaded and installed from the default npm registry; gitHead, annotated source tags and lockfile SHA-512 values match the [release receipt](release.json) |

Initial registry queries returned 404 after successful publication. Actual archive installation was verified after availability, independently of the workflow and tags. The initial bot-created version-PR workflow failed without creating jobs; an owner close/reopen generated normal PR checks, which passed before merge. No repository rule was weakened.

## Remaining connected proof

The existing adopter installed the public packages, applied the owning CLI upgrade without conflicts and verified its managed projections. Thirteen public-package consumer/bridge checks passed, including prerequisite observations. The actual connected-user preflight permits ordinary comments while denying workflow dispatch for missing effective grants; the source issue retains the exact external consumer, App, permissions and receipts. A fixture, owner CLI credential or published SDK cannot replace that App-user proof.

The parent remains open for the missing connected dispatch/continuation outcome. Consumer merge, its current full verification and the exact running revision are reported separately in [#119](https://github.com/juangcarmona/lighthouse/issues/119). No completed acceptance or automatic continuation is inferred from this source release.
