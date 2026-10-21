# Lighthouse CLI

This package is the core Lighthouse harness. It provides the `lighthouse` command, the manifest schema and the generated `LIGHTHOUSE.md` projection.

## Initialize a repository

Install the exact Lighthouse package artifacts selected for the release, create the project manifest and run `lighthouse init`. Inspect the generated `LIGHTHOUSE.md`, then run `lighthouse verify` before adding project-specific policy or exceptions.

The harness package owns the baseline command and verification contract. The SDLC package owns lifecycle skills, commands and metacommands. The UI package owns visual tokens, native recipes and `DESIGN.md`. Stack profiles own their source templates, guidance and checks.

ProductShape, ArcShape and OpenSpec keep their own files and commands. Add them through their supported integration routes when the project needs them, and keep their versions and managed paths visible in the project configuration.

## New repository

1. Select the harness, SDLC, UI and stack profile artifacts required by the application.
2. Create the manifest with exact package and integration versions.
3. Run `lighthouse init`, review the generated projection and run `lighthouse verify`.
4. Add the selected profile checks to the repository verification command and CI workflow.
5. Record project-owned exceptions with an owner and review date.

## Existing repository

1. Inventory the current source layout, tools, managed files and CI before editing.
2. Map existing files to the selected Lighthouse contracts and identify collisions.
3. Adopt the manifest and verifier first; preserve product-owned guidance and generated outputs.
4. Add profiles one at a time and measure their checks before making a workflow status required.
5. Record each exception in the project-owned documentation and remove it when the product is ready.

## Current command scope

The current command supports `init` and `verify`. It checks the manifest, exact version pins and generated content. Lifecycle stages, tracker operations, agent runs and CodeGraph checks require their own configured integrations.

The package does not contain the repository gallery, provider-owned integrations or reference source. Those remain with the source repository or the profile that owns them.
