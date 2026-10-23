# Lighthouse CLI

This package is the core Lighthouse harness. It provides the `lighthouse` command, the manifest schema and the generated `LIGHTHOUSE.md` projection.

## Initialize a repository

Install the exact Lighthouse package artifact selected for the release and run `lighthouse init --name <product>` in a new repository. Add `--profile visual-theme` when the project wants the Lighthouse UI contract. Lighthouse creates the manifest, the `src/`, `docs/`, `infra/` and `scripts/` boundaries, the repository guardrails and the generated `LIGHTHOUSE.md`. Inspect the plan and projection, then run `lighthouse verify` before adding project-specific policy or exceptions.

When the request is expressed in product terms, use the projected `.agents/skills/lighthouse-init/SKILL.md` to prepare a JSON plan that follows `assets/schemas/init-plan.schema.json`. A reference project is optional; the agent asks only the questions needed to resolve the application shape, stacks and profiles. `lighthouse init --plan-file <path>` previews the local operations by default, `--format json` emits the machine-readable plan and `--apply` is required to write it. The CLI does not inspect or copy a reference and performs no remote writes.

For a Lighthouse-owned .NET backend, run `lighthouse create-dotnet <empty-target> --name <PascalCaseProduct>`. The creator seeds the modular backend, Aspire AppHost, CQRS/analyzer sources, tests, profile guidance and deterministic verifier into a new or empty directory. It refuses populated targets and never contacts a remote repository. Run `dotnet restore <Product>.slnx`, then `npm run verify` in the generated product.

The manifest can declare `application.shape` and `application.stacks` when the project has enough information to select compatible profiles. `lighthouse profiles --format json` reports selected profiles, applicability, owned surfaces and verification layers without changing the repository.

Use `lighthouse reconcile` to preview missing Lighthouse-managed paths in an existing adoption. It does not write by default; add `--apply` only after reviewing the plan. Existing files whose content differs from the generated projection are conflicts and are never overwritten by reconciliation.

Use `lighthouse upgrade` to preview a versioned foundation update. The command is dry-run by default, accepts `--scope harness`, `--scope sdlc` or `--scope all`, preserves customized projections and stops when ownership evidence is missing. Add `--apply` only after reviewing the plan, then run `lighthouse verify`.

The harness package owns the baseline command and verification contract. The SDLC package owns lifecycle skills, commands, metacommands, routes and gates, and `lighthouse init` records its selected version in `.lighthouse/sdlc.json`. The UI package owns visual tokens, native recipes, `DESIGN.md` and its agent skill. Selecting `visual-theme` projects the guide and skill into the adopter and enables its deterministic guardrail. Stack profiles own their source templates, guidance and checks; the .NET creator is the packaged entry point for the selected backend profile.

ProductShape, ArcShape and OpenSpec keep their own files and commands. Add them through their supported integration routes when the project needs them, and keep their versions and managed paths visible in the project configuration. In an existing repository, run `lighthouse authorities --adopt-existing` to validate the current ProductShape and ArcShape surfaces without running either initializer; review the dry-run plan and add `--apply` only to record both exact versions in Lighthouse-owned configuration.

Use `lighthouse authorities` to prepare the two baseline authorities through their own CLIs. The command previews both plans by default; `--apply` runs ProductShape's full model initialization and ArcShape's architecture initialization without installing agent capabilities. Provider-owned files remain owned by the provider, and Lighthouse records the exact adopted versions in `lighthouse.json` only after both applications succeed.

The generated manifest enables the public-site route for greenfield repositories. Its build validates ProductShape and ArcShape before creating either snapshot; if the authorities are not ready, the build stops with the repair command instead of publishing a partial site.

Initialization reports missing ProductShape and ArcShape authority inputs as adoption gaps. It does not copy or replace their provider-owned files. The SDLC package remains provider-neutral; an agent host decides where its skills and commands are projected.

## New repository

1. Install the harness and the profile artifacts required by the application.
2. Run `lighthouse init --name <product>` and review the proposed repository boundaries.
3. Review the generated manifest and `LIGHTHOUSE.md`, then run `lighthouse verify`.
4. Add the selected profile checks to the repository verification command and CI workflow.
5. Record project-owned exceptions with an owner and review date.

## Existing repository

1. Inventory the current source layout, tools, managed files and CI before editing.
2. Map existing files to the selected Lighthouse contracts and identify collisions.
3. Adopt the manifest and verifier first; the initializer reports conflicts and preserves product-owned guidance and generated outputs.
4. If ProductShape or ArcShape already exists, run `lighthouse authorities --adopt-existing` and repair any provider validation result before applying it.
5. Add profiles one at a time and measure their checks before making a workflow status required.
6. Record each exception in the project-owned documentation and remove it when the product is ready.

## Current command scope

The command supports `init`, `create-dotnet`, `authorities`, `reconcile`, `upgrade`, `capabilities` and `verify`. It checks the manifest, repository boundaries, Conventional Commits metadata, branch naming, the selected SDLC package projection and generated content. `lighthouse authorities --adopt-existing` validates existing ProductShape and ArcShape authorities without writing provider-owned files. Lifecycle stages, tracker operations, agent runs and CodeGraph checks require their own configured integrations.

Initialization installs `.husky/commit-msg`, `.husky/pre-push`, `scripts/lighthouse-guard.mjs` and `.github/workflows/lighthouse.yml` when those paths are free. Existing files remain project-owned and are reported as conflicts. Reconciliation can add missing managed paths after adoption, but it does not overwrite a path that has drifted or belongs to another tool.

The upgrade route records the ownership hashes in `.lighthouse/upgrade.json`. A missing or stale state file is an adoption gap; reconcile it first instead of allowing a full re-adoption. Upgrade plans report the source and target package and baseline, selected scopes, classifications, preserved paths, verification and recovery action.

The installed SDLC package also publishes a versioned capability catalog. `selected-by-default` capabilities appear as pending until the adopter selects or declines them; `opt-in` capabilities remain available without blocking `upgrade` or `verify`. `lighthouse capabilities select` and `lighthouse capabilities decline` record an explicit local choice, and `lighthouse verify --format json` exposes the adoption status and next command. For the GitHub labels slice, generate a local plan with `lighthouse capabilities plan --id labels --provider github --repo <owner/repo> --plan-file .lighthouse/reconciliation/labels.plan.json`, then apply it only with the plan hash returned by that command.

The package does not contain the repository gallery, provider-owned integrations or reference source. Those remain with the source repository or the profile that owns them.

## Guardrail catalog

The CLI package owns a versioned catalog under `assets/guardrails/`; it describes the guardrails already present in the Lighthouse baseline and their applicability, level, kind, verification method and repair hint.

The profile catalog under `assets/profiles/` describes the application shapes, stacks, owned surfaces and verification layers for each supported profile. A layer can be required, recommended or optional independently of whether its evidence is hard, soft, deterministic, semantic or human.

`level` and `kind` are independent: `level` is `required`, `recommended` or `optional`, while `kind` is `hard` or `soft`; neither dimension selects the verification method.

`lighthouse verify` keeps its existing human-readable success and failure output; `lighthouse verify --format json` exposes the same run for agents and CI without changing the default route.

The catalog uses `passed` when evidence satisfies a check, `failed` when a deterministic check finds a problem, `drift` when managed content differs, `unavailable` when a declared checker cannot run or produce evidence, `unconfigured` when an applicable check or integration is not enabled, `pending-review` when semantic or human judgement is still required, and `not-applicable` when the selected baseline or profiles do not include the guardrail.

Only `passed` and `not-applicable` satisfy a required guardrail; `pending-review` is not evidence of compliance and is distinct from both `unconfigured` and `unavailable`.

To add a future guardrail, the catalog owner adds a JSON entry under the packaged `assets/guardrails/` surface, validates it against `assets/schemas/guardrails.schema.json`, declares its profile applicability and repair hint, and uses an existing checker or an explicit semantic or human verification method; in this delivery the surface belongs to the CLI package, and the CLI core does not change.

A new deterministic checker mechanism or a new engineering practice is outside this catalog and requires a separate Product Change.
