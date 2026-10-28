# Workflow clarity acceptance

[Issue #179](https://github.com/juangcarmona/lighthouse/issues/179) exercises the existing label-driven workflow. [PR #180](https://github.com/juangcarmona/lighthouse/pull/180) supplies the naming, documentation, catalog and upgrade changes. The [delivery guide](../../../src/packages/sdlc/README.md) is the operational entrypoint.

## Verified scope

| Adopter or fixture | Revision and package | Evidence |
| --- | --- | --- |
| Lighthouse, live GitHub | Product source `ffa7e92613ad55989eb16133b1df26d2b7072603`; runtime SDLC **0.14.0** pinned to `55d236d96cf293537af5498ba6f6eb5674c27103` | Owner labels, authenticated workers and published results below |
| Lighthouse, prepared dogfooding | SDLC sources pinned to `e3cc1b94c4fb18a1428900b276412e32191cd53e`; local tarball still declares **0.15.0** before Changesets runs | [Package integrity](package-evidence.json); official packed installer with completion and maintenance; eight short names |
| Clean temporary consumer | The local SDLC tarball | Default installation, implementation/completion upgrades, rejection without replacement authorization, idempotence, compiled-lock drift and actionlint |
| Isolated copy of SoFa | Checkout `af8afecc3f4870ab7c6852d6067f4341fa2efb6c`; local Lighthouse **0.11.4**, SDLC **0.15.0**, UI **0.2.0** tarballs | Installed instructions, label reconciliation, preserved custom labels, partial-failure recovery and projection verification |

Local tarballs contain unreleased changes. The changeset prepares Lighthouse **0.11.5** and SDLC **0.15.1**. Neither registry publication nor live adoption of the renamed workflows is established by this record. SoFa's real checkout was not modified; no other adopter runtime was verified.

## Live label exercise

1. The owner added `future`, then `refine`. [Router](https://github.com/juangcarmona/lighthouse/actions/runs/40669682113) dispatched [refinement](https://github.com/juangcarmona/lighthouse/actions/runs/40669740226).
2. Refinement published [passed](https://github.com/juangcarmona/lighthouse/issues/179#issuecomment-6466482640), projected `ready`, consumed `refine` and released `agent-working`. It queued the `implement` label but `future` kept implementation paused.
3. The owner added `propose` at `2026-10-28T10:23:19Z`. [Router](https://github.com/juangcarmona/lighthouse/actions/runs/40671721541) dispatched [proposal](https://github.com/juangcarmona/lighthouse/actions/runs/40671795403). It published [passed](https://github.com/juangcarmona/lighthouse/issues/179#issuecomment-6466766066) and created [proposal PR #181](https://github.com/juangcarmona/lighthouse/pull/181), containing only five OpenSpec files. Publication consumed `propose`, set `waiting-review` and released `agent-working`; `future` remained. OpenSpec 1.15.0 strict validation passed in the publisher.

[Runtime evidence](runtime-evidence.json) records the source, actual harness version, label actors, run identities and artifact digests. Both downloaded stage results passed local schema validation. A package version in the default branch does not identify the worker's pinned runtime. `future` remains in place; this exercise grants no implementation or merge authorization.

## Reproduce the package checks

```sh
npm run verify
bash scripts/verify-issue-workflows.sh
LIGHTHOUSE_CONSUMER_ROOT=<adopter-checkout> npm run verify:package-consumer
```

The consumer script copies the checkout before installing. Use a disk-backed `TMPDIR` if the host's temporary filesystem has insufficient inodes.

`npm run verify` passed: **252 tests**, **3 opt-in container tests skipped**, Markdown lint, local Markdown links and public-site compilation. The skipped tests cover real PostgreSQL, host failure/cancellation cleanup and container workspace tools. The packed installer compiled seven worker locks with gh-aw **v0.93.2**, retained dispatch filenames, produced all eight short display names and passed actionlint **1.7.12**. Template compilation also repaired stale packaged lock projections from their existing Markdown sources.

Existing adopters must explicitly run the [workflow update procedure](../../../src/packages/sdlc/README.md#install-or-update-workflows) after upgrading npm packages. Labels capability version 2 requests a new adoption review while preserving other capability choices and existing repository labels.
