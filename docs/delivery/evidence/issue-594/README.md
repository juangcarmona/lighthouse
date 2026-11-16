# Engineering practice evidence delivery

The owner approved CHG-ENGINEERING-PRACTICE-EVIDENCE-001 in [#594](https://github.com/juangcarmona/lighthouse/issues/594#issuecomment-6923262284). ProductShape validated and applied the definition in [#716](https://github.com/juangcarmona/lighthouse/pull/716), including the move into `docs/product/changes/completed/`. [#717](https://github.com/juangcarmona/lighthouse/pull/717) delivered the catalog and observation contract, [#718](https://github.com/juangcarmona/lighthouse/pull/718) the evaluator and native collector, and [#719](https://github.com/juangcarmona/lighthouse/pull/719) historical aggregation. [#720](https://github.com/juangcarmona/lighthouse/pull/720) completed versioning and the regression rejecting conflicting revisions for one immutable source run.

## Source and publication

| Receipt | Result |
| --- | --- |
| Source revision | `c9aa6e31dcb2baebc644a7ef4183fedfb200ca0b` |
| Final local source verification | 1,384 tests: 1,369 passed, 15 optional skips; all 28 practice regressions passed |
| Other source checks | Markdown lint, links and 136-file public site passed; native .NET, visual, package and clean-consumer checks passed |
| Protected publication | [Run 43922711600](https://github.com/juangcarmona/lighthouse/actions/runs/43922711600), with the owner-authorized environment review |
| Public packages | SDLC 0.25.0 and CLI 0.13.17; `latest`, registry gitHead and package tags verified against the source revision |

The public registry initially returned missing metadata and then a missing CLI archive after the publish workflow completed. Actual registry installation was verified separately. A rejected version-PR merge also retained its original failure: manual verification did not satisfy the protected PR-associated `repository` check. Reopening the PR generated normal checks, which passed before merge. Protection remained active.

## Connected source example

The registry-installed SDK collected [run 43922711675, attempt 1](https://github.com/juangcarmona/lighthouse/actions/runs/43922711675/attempts/1), repository job 133493912022, at the release revision. The `Execute practice evidence regressions` step executed 19/19 passing tests from its three declared core test files. Effective required-check integration and CI failure propagation were independently verified.

[The generated assessment](release-source-assessment.json) retains exact source identity, producer, measurements, collection coverage, provenance digests and enforcement sources. It establishes the tests practice for that exact release revision and scope. Thirteen other practice observations are missing; the overall level is `unverified`. This retained example cannot certify a later repository revision. Synthetic combinations in the regressions establish evaluator behavior, including L3 without mutation; they do not establish a real project's level.

## Consumer qualification

The registry-installed package passed full verification in an existing adopter, separately from source tests and package publication. The [external qualification receipts](https://github.com/juangcarmona/lighthouse/issues/594) identify the exact repository/source, native test execution, package integrity, upgrade projection, local verification and adoption PR. Merge and postmerge execution are recorded separately in that issue. Consumer-specific paths and identities remain in those external receipts.

The report preserves missing evidence and unavailable enforcement. It installs no scanner, schedule or hosting rule. History retains sampling coverage, gaps, compatible definitions, level distributions, measurement trends, current and superseded source references and the prohibition on source-receipt deletion. It cannot serve as current certification.

Review used Ponytail for source and the repository's Plain English/Humanizer fallback for explanatory prose. Provider-owned files were applied or generated through their owning tools.
