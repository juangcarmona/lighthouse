# Lighthouse CLI

This package is the core Lighthouse harness. It provides the `lighthouse` command, the manifest schema and the generated `LIGHTHOUSE.md` projection.

## Initialize a repository

Install the exact Lighthouse package artifact selected for the release and run `lighthouse init --name <product>` in a new repository. Lighthouse creates the manifest, the `src/`, `docs/`, `infra/` and `scripts/` boundaries, the repository guardrails and the generated `LIGHTHOUSE.md`. Inspect the plan and projection, then run `lighthouse verify` before adding project-specific policy or exceptions.

The harness package owns the baseline command and verification contract. The SDLC package owns lifecycle skills, commands and metacommands. The UI package owns visual tokens, native recipes and `DESIGN.md`. Stack profiles own their source templates, guidance and checks.

ProductShape, ArcShape and OpenSpec keep their own files and commands. Add them through their supported integration routes when the project needs them, and keep their versions and managed paths visible in the project configuration.

The generated manifest enables the public-site route for greenfield repositories. Its build validates ProductShape and ArcShape before creating either snapshot; if the authorities are not ready, the build stops with the repair command instead of publishing a partial site.

Initialization reports missing ProductShape and ArcShape authority inputs as adoption gaps. It does not copy or replace their provider-owned files.

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
4. Add profiles one at a time and measure their checks before making a workflow status required.
5. Record each exception in the project-owned documentation and remove it when the product is ready.

## Current command scope

The command supports `init` and `verify`. It checks the manifest, repository boundaries, Conventional Commits metadata, branch naming and generated content. Lifecycle stages, tracker operations, agent runs and CodeGraph checks require their own configured integrations.

Initialization installs `.husky/commit-msg`, `.husky/pre-push`, `scripts/lighthouse-guard.mjs` and `.github/workflows/lighthouse.yml` when those paths are free. Existing files remain project-owned and are reported as conflicts.

The package does not contain the repository gallery, provider-owned integrations or reference source. Those remain with the source repository or the profile that owns them.
