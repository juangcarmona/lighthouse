---
title: Building block view
arc42-section: "05"
description: Static decomposition of the current Lighthouse checkout.
---

# 5. Building block view

Lighthouse is a repository and package workspace. It has no long-running Lighthouse service.

| Building block | Source | Responsibility |
| --- | --- | --- |
| CLI package | `src/packages/cli/` | Validate a manifest and generate `LIGHTHOUSE.md` |
| UI package | `src/packages/ui/` | Export semantic CSS tokens, native recipes and the distributed `DESIGN.md` contract |
| Lighthouse .NET profile | `src/dotnet/` | Provide Minimal API, modular-monolith, CQRS/VSA, Aspire and Roslyn reference tooling and tests |
| Gallery | `src/gallery/` | Exercise the UI package in a browser |
| Public site | `src/public-site/` | Present the current Lighthouse story as static HTML/CSS/JS |
| Repository checks | `src/tests/` and `scripts/` | Test packages, links, adoption and public-site output |
| Product and architecture docs | `docs/product/` and `docs/architecture/` | Keep provider-owned intent and architecture sources reviewable |

The active Product Change describes additional work-item and agent capabilities. No corresponding implementation block exists in this checkout yet.
