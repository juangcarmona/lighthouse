# Trusted validation and bounded CI correction

Issue [#311](https://github.com/juangcarmona/lighthouse/issues/311) adds trusted validation before publication and automatic correction of failed CI through the existing same-PR feedback worker. The first native acceptance succeeded: a deliberately failing candidate triggered correction without another owner action, and actual CI passed on the corrected head of PR #354. The fixture grants no merge, product approval, release or deployment authority.

## Native acceptance

| Observation | Original GitHub evidence | Result |
| --- | --- | --- |
| One original owner request | [Router 41795753662](https://github.com/juangcarmona/lighthouse/actions/runs/41795753662), [worker 41795792650](https://github.com/juangcarmona/lighthouse/actions/runs/41795792650) | One implementation identity, one PR #354; all four host checks passed |
| Deliberate CI failure | [CI 41797814486](https://github.com/juangcarmona/lighthouse/actions/runs/41797814486) | Normal verification passed; the separate trusted assertion rejected the intermediate fixture paragraph |
| Automatic continuation | [Router 41798021961](https://github.com/juangcarmona/lighthouse/actions/runs/41798021961) | Bot callback authenticated the failed run and original grant; no owner restart |
| Correction 1 of 2 | [Worker 41798129891](https://github.com/juangcarmona/lighthouse/actions/runs/41798129891) | Same PR, original identity and grant; all four host checks passed |
| Corrected candidate | [CI 41800220073](https://github.com/juangcarmona/lighthouse/actions/runs/41800220073) | Success on `fd6c4b24313f9e21eb8c030b12b04cb5c48ce4b6`; PR automatically ready for review |
| Delayed old-head replay | [Router 41802846190](https://github.com/juangcarmona/lighthouse/actions/runs/41802846190) | Successful no-op; dispatch skipped, current PR head unchanged |

The initial candidate head was `1f1fb6f9fa575f02f756a7916e5dda47001718b6`; the original implementation identity was `e40f37678b6b207f77b0f11bc7d2cd5333a35b9a908b0bb939726fc774ec7f58`. Correction attempt 1 retained original worker `41795792650`, request identity and implementation policy. The positive interval, from the original request at 07:56:33 UTC to corrected CI completion at 08:33:39 UTC, contained no further owner comment, label, dispatch, approval or source upgrade. The later manual dispatch tested replay only. Separate PR-event CI remained `action_required`; it is not counted as a passed check or approved by this experiment.

This controlled delivery took 37 minutes 6 seconds, including 18 minutes 45 seconds from failed CI completion to corrected CI completion. It proves this route, not a population reliability rate or a performance target. Both workers used the configured `openai/gpt-6.1-sol` build profile with medium reasoning. Runtime receipts explicitly mark provider-reported model identity unavailable and billing unknown.

## Second qualification phase — in progress

After #355 merged, [one explicit owner feedback](https://github.com/juangcarmona/lighthouse/pull/354#issuecomment-6627128987) deliberately restored the intermediate paragraph. [Feedback worker 41805768697](https://github.com/juangcarmona/lighthouse/actions/runs/41805768697) passed all four host checks and publication validation using harness `fb02d02c11efdd9d9ac4f503b08569466e2663cb`, publishing third commit `ef2aab5ad310153e6eb009166fd2dbe9d3748468` on the same PR. [CI 41807700574](https://github.com/juangcarmona/lighthouse/actions/runs/41807700574) failed the intended assertion; its callback started [router 41807932144](https://github.com/juangcarmona/lighthouse/actions/runs/41807932144) automatically. The retained dispatch selected correction attempt **2**, preserving the original implementation identity, grant and policy digest. [Correction worker 41808117191](https://github.com/juangcarmona/lighthouse/actions/runs/41808117191) is still in progress; this phase is not yet counted as a successful repair.

## Implementation and authority

[PR #347](https://github.com/juangcarmona/lighthouse/pull/347) introduced the mechanism. [PR #350](https://github.com/juangcarmona/lighthouse/pull/350) corrected provider qualification. [PR #351](https://github.com/juangcarmona/lighthouse/pull/351) completed same-PR feedback continuity and the immediate CI callback. The successful first trace used main `2bcf65aa0f438f60f1da6c8a909d18aa9486c15d` with executable harness `56464d94182e2dc7d238a8101a8b7e9f2ae9f378`.

[PR #355](https://github.com/juangcarmona/lighthouse/pull/355) binds publication checks to the admitted repository's immutable policy and actual candidate link targets, instead of the publisher's harness checkout. It also fingerprints CI authority using workflow, repository, attempt, head, branch, status and conclusion, excluding unrelated repository metadata. Its executable harness is `fb02d02c11efdd9d9ac4f503b08569466e2663cb`.

The router authenticates adopted CI, repository, current head and branch, exactly one repository-owned Lighthouse PR, and retained implementation publication. Original intent, owner answers, write scope and check policy must still match. Failed job logs are diagnostic data. Two correction attempts belong to the original PR identity across changed heads; pending acknowledgements, active work, owner objections, paused issues and unknown effects cannot authorize additional work. Product model edits and other Product Changes are excluded; provider revalidation and renewed product decisions retain their own path.

Immediate continuation uses the trusted existing CI reconciliation job with `always()`, its real failed dependency and an authenticated callback. Existing scheduled PR reconciliation supplies a fallback. Both signal the same router, which repeats authority checks after CI terminates. The callback creates no merge authority. Adopters own their CI definition and must review this integration when installing the feature.

Publication checks use proposed-file overlays plus immutable candidate facts for local links, and admitted base policy for the pinned Markdown validator. ProductShape and OpenSpec checks remain independent. Absence of an adopted Markdown command does not introduce a new style policy. The citation check was added to Lighthouse's implementation policy, including the acceptance fixture; the worker could not replace these host commands.

## Verification

Final runtime verification passed with 591 tests: 584 passed, zero failed and seven optional skips. The final publication/CI regression subset passed 33/33. Tests cover unrelated/fork/stale CI, changed intent and policy, human objections, lost dispatch acknowledgement, duplicate/out-of-order completions, exhaustion across changed heads, active owner feedback, historical dispatch versus candidate revisions, and altered external heads. Actual malformed Markdown errors, proposed/deleted/local link targets, remote adopter policy and candidate facts are exercised without git hooks.

Managed workflows were regenerated with gh-aw 0.93.2, preserving adopter maintenance customization. Source YAML passed actionlint 1.7.12 with adopted runner labels and the unsupported `queue` concurrency extension excluded. Compiler-generated expressions are validated by their owning compiler. Local package-consumer verification uses a disposable adopter copy; CI separately exercises a clean package consumer. Neither is evidence of registry publication.

OpenSpec strict validation passed after duplicate citation blocks were consolidated after the scenarios, preserving the same six canonical references. The canonical product model is unchanged. ProductShape model validation reports zero errors and warnings. Citation verification reports zero errors and two pre-existing stale-citation warnings in `openspec/changes/issue-272-product-change/proposal.md` (`FR-AGENT-MEMORY`, `BR-MEMORY-BOUNDARY`); those warnings remain visible.

## Failed experiments retained

| Attempt | Observed failure | Disposition and correction |
| --- | --- | --- |
| Issue #346 / PR #349 | [Worker 41785445366](https://github.com/juangcarmona/lighthouse/actions/runs/41785445366) passed its supplied checks but independently found four unclassified new #311 planning documents outside fixture scope | Closed unmerged; #350 bound those documents using installed provider citations and added the missing host citation check |
| Issue #348 / PR #352 | [CI 41789516505](https://github.com/juangcarmona/lighthouse/actions/runs/41789516505) failed as intended, but no completion router arrived during the observation interval; no correction began | Closed unmerged; #351 added the explicit authenticated callback and retained scheduled reconciliation |

These attempts are failures, not successful unattended acceptance. The retained schedule observations showed gaps despite the five-minute cron. GitHub documents [event suppression with its workflow token](https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow) and [schedule delays](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule); neither document proves the exact platform cause of this individual missing event.

## Evidence and remaining boundaries

`native/` retains original API snapshots and selected original artifact members, including inputs, dispatches, runtime, host commands/results, publication changes and receipts. `download-manifest.json` records downloaded archive IDs, sizes and SHA-256 hashes. Retained artifact bytes are not rewritten; retrospective Markdown is stored with a `.txt` suffix to keep provider-owned output outside repository Markdown linting. `SHA256SUMS` covers retained files. These downloaded snapshots are audit evidence; production admission still authenticates native Actions origins and receipts rather than trusting this report.

Interruption and missed-event recovery, including linked retries of CI corrections, remains with #142. Producer/freshness coverage remains with #100, independently verified resource absence with #219, real-change unattended pilots with #185/#186, and published-consumer portability with #216. A green controlled fixture, source merge and package publication are separate observations.
