# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route, stage and gate descriptors, deterministic triage and decomposition projections, rebuildable state checks and the provider-neutral control-plane contract.

It publishes `command-aliases.json` as the versioned, machine-readable mapping from selected `/lh:*` aliases to canonical `/lighthouse:*` command assets. Run `lighthouse-sdlc aliases --format json` to inspect it; the configured agent host decides how to expose the aliases.

It also provides the `browser-e2e` evidence contract for Playwright journeys. The contract belongs to the SDLC because it records delivery evidence; the tests, journeys and browser configuration remain owned by the adopter.

It provides a neutral evidence contract for delivery, product and architecture references. `lighthouse-sdlc evidence` validates records or builds a deterministic coverage index; it does not replace ProductShape, ArcShape or a future quality evaluator.

It does not run agents, store transcripts, dispatch work between repositories or replace ProductShape, ArcShape, OpenSpec or an agent host.

Install it with the Lighthouse CLI or run `lighthouse-sdlc verify` from the package installation to check the distributed contract.

Run `lighthouse-sdlc triage --input <file>` to validate one structured triage result and receive its proposed workflow and classification labels. The command is read-only by default; `--apply --labels-file <file>` writes only after the report is ready and the labels file still matches the input.

Use `lighthouse-sdlc route --route <name>` to inspect a route before running it, `stage-result --input <file>` to validate a stage result, `state --input <events.json>` to replay workflow events, `control-plane --input <file>` to validate host declarations, `decompose --input <file>` to produce a dependency-checked slice plan and `stacked --input <file>` to produce an ordered pull-request plan.

Use `lighthouse-sdlc browser-e2e --input <evidence.json>` to validate a Playwright journey result. It is read-only and does not start a browser or write provider state.

Use `lighthouse-sdlc evidence --input <record-or-index.json>` to validate evidence, or add `--build --output <index.json>` to build an index and its compact record files from full records. The command is read-only unless the output path is explicitly provided.

Use `lighthouse-sdlc github-triage --repo <owner/repo> --issue <number> --assessment <file>` for the first GitHub projection. It reads issue metadata by default; `--apply` is the explicit label mutation boundary and rereads the issue before writing.

Use `lighthouse-sdlc github-decompose --repo <owner/repo> --issue <number> --input <file>` to turn a validated slice plan into child-issue operations. The default is a preview; `--apply` creates the child issues in dependency order with the parent link and acceptance evidence in each body.

Declare selected adoption capabilities in a JSON file that follows `schemas/capabilities.schema.json`. `reconcile-labels` previews and optionally applies the first local label projection; `github-labels` reads the repository labels through `gh`, creates only missing labels after an explicit `--apply`, preserves existing values and records `.lighthouse/reconciliation/labels.json`.

`capabilities.json` is the versioned adoption catalog. It currently declares the GitHub labels capability, its label roles and classifications, suggested colors and descriptions, declared transition policy and allowed operations.

The catalog is descriptive until a consumer creates an explicit plan. `lighthouse upgrade` can discover it, but only `lighthouse capabilities apply --plan-file ... --authorize ...` may write provider state.

Every catalog entry must name a registered adapter. Package verification fails when an entry has no adapter, and a new adapter is complete only when its plan, apply, verification, evidence and packaged-consumer fixture are covered by CI.

`selected-by-default` capabilities appear as pending until the adopter selects or declines them. `opt-in` capabilities appear as available and do not make `upgrade` or `verify` fail until the adopter selects them.

Evidence is explicit: an absent field appears in `missingEvidence`, a check that cannot run appears in `unavailableChecks`, and a judgement awaiting review appears in `pendingReview`. Only `provided` evidence can make a report ready to apply.

The package is a source of lifecycle instructions and contracts; an adopter's host adapter decides where provider-specific projections are installed.
