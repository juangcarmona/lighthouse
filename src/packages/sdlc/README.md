# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route, stage and gate descriptors, deterministic triage and decomposition projections, rebuildable state checks and the provider-neutral control-plane contract.

It publishes `command-aliases.json` as the versioned, machine-readable mapping from selected `/lh:*` aliases to canonical `/lighthouse:*` command assets. Run `lighthouse-sdlc aliases --format json` to inspect it; the configured agent host decides how to expose the aliases.

It also provides the `browser-e2e` evidence contract for Playwright journeys. The contract belongs to the SDLC because it records delivery evidence; the tests, journeys and browser configuration remain owned by the adopter.

It provides a neutral evidence contract for delivery, product and architecture references. `lighthouse-sdlc evidence` validates records or builds a deterministic coverage index; it does not replace ProductShape, ArcShape or a future quality evaluator.

It has no persistent execution service, transcript store or cross-repository dispatcher. The optional Actions adapter executes the selected engine under operator policy. ProductShape, ArcShape and OpenSpec retain their own authority.

## External host contract

`src/host-contract.mjs` validates a supervised `triage` or `refine` request against a trusted host policy and validates the resulting stage/effect envelope. It is exported as `@juangcarmona/lighthouse-sdlc/host-contract`. See [the wire contract](host-contract.md) for fields and host obligations. Execution, credentials, admission, cancellation and publication remain host responsibilities.

The external-host adapter remains available for existing adopters. New repository automation uses the gh-aw path below; do not enable both routers for the same events.

## GitHub Actions execution

The optional router accepts an owner-added `refine` label, an owner reply to a pending `needs-info` question or an owner manual dispatch. It calls the compiled gh-aw refinement worker. Actions authorizes the request, reserves the issue, runs OpenCode, validates its result and publishes through a separately credentialed job. SoFa can observe these runs without participating in execution.

Preview installation with `node node_modules/@juangcarmona/lighthouse-sdlc/src/install-workflows.mjs <repository> <immutable-lighthouse-commit>`. Install gh-aw v0.93.2, then add `--apply` to write and compile the selected sources. Existing different files require review and `--replace-reviewed`. Commit the Markdown, router, shared engine definition, generated lock and action pins together. Set the repository variable `LIGHTHOUSE_AUTOMATION_ENABLED=true` after provisioning the runner and disabling previous routers.

Only `refine` is enabled by this installer. The other stage templates remain in the package as reference assets; they are not a working unattended delivery pipeline. Foundation initialization and upgrades do not install workflows. On upgrade from an older baseline, existing workflows remain untouched and leave the foundation's managed-file inventory. Review and remove obsolete projections explicitly.

The worker requires a Linux runner labelled `lighthouse-workflow`, Node.js, Docker, `flock` and `LIGHTHOUSE_ENGINE_CONFIG` pointing to an operator-owned configuration. See the source repository's `src/examples/opencode-engine` deployment example. The imported OpenCode engine starts a foreground container with read-only product source and harness package, a writable result directory and operator-managed provider authentication. Packaged skills load from `/harness/skills`; consumers do not copy the lifecycle skills into their source tree.

The subscription profile uses Docker isolation and explicitly disables gh-aw's AWF agent sandbox. It has no AWF egress filtering or credential proxy. The engine gets no GitHub token or Docker socket. Only trusted repository workflows may use the runner, whose Docker access is privileged infrastructure access. All repository runners sharing a host must use the same operator lock path to serialize model execution.

Actions exposes the `Execute OpenCode CLI` step, streamed JSON events, standard gh-aw log artifacts, the result envelope and a runtime receipt with source, harness and image revisions. Logs redact common credential formats; this is not a guarantee that arbitrary sensitive product content is removed. Review public-repository content and artifact access accordingly. Agent artifacts use GitHub retention; they are not a permanent retrospective archive.

Publication validates the Lighthouse envelope and rereads owner answers, issue state and source revision. Three unresolved reply rounds require an explicit new `refine` label. `agent-working` signals a reservation; human takeover or a changed source prevents publication. Labels are cooperative signals, not locks against arbitrary editors. A runner or artifact failure can require manual reservation reconciliation. A completed refinement never authorizes the next stage or a merge.

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

The [external host contract](host-contract.md) supports owner-authorized `refine` labels, schema-1 compatibility and the shared deterministic event router. Work reservations use `agent-working` and `human-working`; the host owns the durable lock.
