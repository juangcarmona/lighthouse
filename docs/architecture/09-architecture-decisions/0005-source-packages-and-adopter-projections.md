---
id: ADR-0005
name: source-packages-and-adopter-projections
title: Separate source packages from adopter projections
description: Keep Lighthouse implementation under src while generating adopter root contracts explicitly.
status: Accepted
date: "2026-10-20"
deciders: [juangcarmona]
tags: [distribution, packaging, repository-layout]
---

<!-- markdownlint-disable-next-line MD025 -->
# ADR-0005: Separate source packages from adopter projections

## Context

Lighthouse is both a source repository and an adoption baseline. Its initial layout kept the manifest, generated projection, manifest schema, CLI scripts, gallery configuration and tests at the repository root. That made the source checkout resemble an adopter repository and obscured which files belong in a delivered package.

The source repository also owns a gallery, CSS packages, a .NET profile and repository verification. Adopting products need a different set of root files: `lighthouse.json`, `LIGHTHOUSE.md` and `schemas/lighthouse-manifest.schema.json` are their local configuration and generated projection.

## Decision

- Keep the root `package.json` and lockfile as the private npm workspace coordinator. Keep root tool-discovery files and repository automation entrypoints where npm, GitHub, editors and agent hosts expect them.
- Put reusable Lighthouse CLI source and its delivery assets under `src/packages/cli/`. The package owns the `lighthouse` command and the manifest schema asset.
- Keep the UI package under `src/packages/ui/`, the gallery source and visual tests under `src/gallery/`, and Node verification tests under `src/tests/`.
- Keep only repository verification automation in the root `scripts/` directory. Reusable profile and CLI implementation belongs under `src`.
- Do not keep `lighthouse.json`, `LIGHTHOUSE.md` or the manifest schema in the Lighthouse source checkout. The creator copies the schema and generates the manifest and projection in an adopting repository.
- Keep package delivery narrow through each package's `files` and `exports` contract. Tests, documentation and provider-owned integrations are not runtime package contents unless a package explicitly owns them.

## Alternatives considered

- **Keep the source checkout self-adopted:** rejected because it mixes the baseline implementation with the files it generates for consumers. The CLI tests still exercise adoption through temporary fixtures.
- **Move every root file into `src`:** rejected because npm workspaces, lockfiles, GitHub workflows, editor configuration and agent or provider integrations use root discovery contracts.
- **Publish one package containing the full repository:** rejected because UI, CLI, .NET profile and agent integrations have different consumers and ownership boundaries.
- **Keep tests at the root:** rejected because the tests are source code and can be colocated without changing delivered package contracts.

## Consequences

- **Positive:** The Lighthouse source checkout has a smaller root and a clear distinction between implementation, documentation, automation and adopter output.
- **Positive:** A future CLI release has a package boundary ready for `npm pack` without publishing the gallery, .NET reference source or repository documentation.
- **Negative:** The creator still produces consumer-root files because those files are adoption contracts, not package source.
- **Neutral:** Root verification no longer validates a Lighthouse self-manifest. Unit tests validate the CLI against temporary adopter fixtures and the adoption check validates a generated product.

## References

- [Distribution and versioning](0002-distribution.md)
- [Lighthouse UI package](0004-lighthouse-ui-package.md)
- [Harness package guide](../../../src/packages/cli/README.md)
- [Lighthouse CLI package](../../../src/packages/cli/README.md)
