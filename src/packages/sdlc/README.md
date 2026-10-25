# Lighthouse SDLC

This package provides the provider-neutral delivery contract for Lighthouse adopters.

It owns the six lifecycle skills, their command entrypoints, route, stage and gate descriptors, deterministic triage and decomposition projections, rebuildable state checks and the provider-neutral control-plane contract.

It publishes `command-aliases.json` as the versioned, machine-readable mapping from selected `/lh:*` aliases to canonical `/lighthouse:*` command assets. Run `lighthouse-sdlc aliases --format json` to inspect it; the configured agent host decides how to expose the aliases.

It also provides the `browser-e2e` evidence contract for Playwright journeys. The contract belongs to the SDLC because it records delivery evidence; the tests, journeys and browser configuration remain owned by the adopter.

It provides a neutral evidence contract for delivery, product and architecture references. `lighthouse-sdlc evidence` validates records or builds a deterministic coverage index; it does not replace ProductShape, ArcShape or a future quality evaluator.

It does not run agents, store transcripts, dispatch work between repositories or replace ProductShape, ArcShape, OpenSpec or an agent host.

## External host contract

`src/host-contract.mjs` validates a supervised `triage` or `refine` request against a trusted host policy and validates the resulting stage/effect envelope. It is exported as `@juangcarmona/lighthouse-sdlc/host-contract`. See [the wire contract](host-contract.md) for fields and host obligations. Execution, credentials, admission, cancellation and publication remain host responsibilities.

Print the opt-in GitHub adapter with `node node_modules/@juangcarmona/lighthouse-sdlc/src/host-contract.mjs workflow`. It expects a provisioned `lighthouse-host-bridge` on a repository runner labelled `lighthouse-host`. Installing the package does not enable that adapter. The existing gh-aw projection remains a separate execution path.

## gh-aw workflow projection

The package includes the six Lighthouse SDLC worker sources, their compiled `.lock.yml` workflows and the router projection. The Lighthouse CLI projects them into `.github/workflows` during initialization, reconciliation or an explicit `lighthouse upgrade --scope sdlc --apply`; package installation alone does not write repository files.

Workers resolve instructions and validators from the installed SDLC package and reject a version mismatch with `.lighthouse/sdlc.json` before execution. Consumers need a committed npm lockfile.

The host must provide the runner capability `[self-hosted, linux, lighthouse-sdlc]`, the GitHub and gh-aw credentials required by the compiled workflow, the selected route and stage input, and durable evidence handling for the uploaded stage result. Each worker executes one declared stage and writes `/tmp/gh-aw/agent/stage-result.json`; the host remains responsible for runtime, queues, budgets and model selection. The generic runner capability is a contract, not a SoFa or Bastion identity.

The router validates the existing Lighthouse route and `requires` declarations. A normal dispatch runs one stage. The current worker host cannot verify human gate decisions, so it rejects `ff` for every bundled route. Use individual stage dispatches under host supervision until an approval adapter exists. The `integrate` worker prepares the configured merge action without merging unless repository policy authorizes it; `review` closes the flow with `gate: null`.

Workers require `stage-result --require-complete --stage <stage> --run-id <id>` before reporting success. This checks the dispatched identity, the gate in `stages.json`, `status: passed`, empty blocker arrays and resolved evidence statuses. Plain `stage-result --input <file>` still validates the structure of reports, including blocked reports. Completion validation does not verify evidence provenance or grant approval to cross a human gate; the host owns those checks.

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

The [external host contract](host-contract.md) supports owner-authorized `refine` labels, schema-1 compatibility and the shared deterministic event router. Work reservations use `agent-working` and `human-working`; the host owns the durable lock.

## Repository-owned issue refinement

The optional GitHub-native adapter routes an owner-added `refine` label or an owner answer to a pending `needs-info` question into one reusable refinement worker. Actions owns authorization, concurrency, reservation, source/context preparation, result validation and publication. A replaceable executor runs the isolated agent; SoFa is an optional observer and verifier, never a prerequisite for this route.

Preview installation with `node node_modules/@juangcarmona/lighthouse-sdlc/src/install-issue-workflows.mjs <repository> <immutable-lighthouse-commit>`. Review the two workflows and add `--apply` to write them. Disable any previous automatic host bridge before enabling the router. The adapter is opt-in and pins its implementation independently of the installed foundation version; it does not alter existing gh-aw routes or claim later delivery stages are enabled.

The worker needs a dedicated `lighthouse-workflow` runner with Node.js 22 or newer and a local executor socket at `/run/lighthouse/engine.sock`. The source repository contains an optional operator deployment example under `src/examples/bastion-executor`. Keep engine authentication outside the repository. The workflow supplies no GitHub credentials to the executor or agent.

Each run displays separate preparation, execution, validation, publication and cleanup steps, with progress metadata every fifteen seconds while the engine runs. The summary links the outcome; the artifact contains the request and validated result. Owner replies are included automatically, and three unresolved reply rounds require an explicit new label. Only the owner is admitted in this first adapter. Human takeover, source changes or changed answers prevent publication. A runner crash can leave a reservation requiring operator reconciliation; no automatic recovery or later-stage composition is claimed.
