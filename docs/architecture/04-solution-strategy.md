---
title: Solution strategy
arc42-section: "04"
description: Structural choices used by the current Lighthouse implementation.
---

# 4. Solution strategy

## Source layout

Implementation stays under `src/`, documentation under `docs/` and repository automation under `scripts/`. Root files remain only when npm, GitHub, editors or provider tools discover them there.

## Package layout

The workspace keeps the CLI, UI and any later technical profiles as separate private packages. The UI package contains tokens, native recipes and its design guide. Each package declares its own files and exports. The repository does not publish a package containing the gallery, .NET reference source or documentation.

## Verification strategy

Checks run at the cheapest useful boundary: Node tests and Markdown checks cover repository contracts, .NET tests cover analyzers and the reference backend, and Playwright covers the visual gallery. The public site build copies a static source tree and bundles the UI package CSS.

## Authority boundaries

ProductShape owns product intent and ArcShape owns architecture documentation when a project adopts them. Lighthouse records their integration pins in the consumer manifest, while their CLIs and generated files remain provider-owned.
